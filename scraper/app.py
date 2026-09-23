"""
OLX Scraper Aprimorado
Combina a robustez do Selenium (JavaScript renderizado) com as
boas práticas do pyolxbrazil: multipáginas, conversão de datas, dicionários.

Hardened para rodar sem supervisão em VPS: bloqueio de imagens/CSS,
proxy autenticado, retry com backoff, tolerância a falha por página,
output em JSON e logging estruturado.
"""
import argparse
import datetime
import json
import logging
import random
import re
import tempfile
import unicodedata
import zipfile
from pathlib import Path
from time import sleep
from typing import Optional

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURAÇÕES - edite aqui
# ──────────────────────────────────────────────────────────────────────────────
BUSCA        = 'iphone'    # Use %20 para espaços
ESTADO       = 'pe'        # sigla do estado
CATEGORIA    = 'celulares' # 'celulares' ou 'games'
CONDICAO     = 'usado'     # 'novo', 'usado' ou 'defeito'
PAGINAS      = 100    # quantas páginas raspar (None = só a 1ª)

# Pasta onde cada JSON de execução é salvo.
# Usa o diretório do próprio script para funcionar corretamente
# independente de onde o worker.js invoca o processo.
PASTA_SAIDA  = str(Path(__file__).parent)

HEADLESS     = False       # True em produção (sem janela); False para debug local

# Proxy residencial autenticado (usuário/senha).
# Deixe USAR_PROXY = False para rodar sem proxy (ex: testes locais).
USAR_PROXY  = False
PROXY_HOST  = ''
PROXY_PORT  = ''
PROXY_USER  = ''
PROXY_SENHA = ''

# Retry com backoff progressivo ao carregar uma página (timeout / erro do driver).
# Ex: [5, 15] = tenta de novo após 5s, se falhar de novo tenta após 15s.
BACKOFF_SEGUNDOS = [5, 15]

# Aborta a execução inteira se este número de páginas seguidas falhar
# (mesmo depois de esgotar os retries de cada uma).
MAX_FALHAS_CONSECUTIVAS = 3

# Quantos anúncios o OLX mostra numa página cheia (usado só pra desconfiar de raspagem parcial).
ANUNCIOS_PAGINA_CHEIA = 40

# Slug da categoria na URL do OLX + nome do parâmetro de condição (varia por categoria)
CATEGORIAS = {
    'celulares': {'slug': 'celulares', 'key': 'elcd'},
    'games':     {'slug': 'videogames', 'key': 'cfl'},
}

# Códigos de condição dentro do parâmetro da categoria.
# "usado" adiciona a MESMA key duas vezes (2 e 3) na URL; "novo" e "defeito" adicionam só uma vez.
CONDICOES = {
    'novo':    ['1'],
    'usado':   ['2', '3'],
    'defeito': ['5'],
}
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger('olx_scraper')

# Converte "Hoje", "Ontem", "31 de ago" à data real dd/mm
meses = {
    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
    'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
}

def normalizar_data(texto: str) -> str:
    texto = texto.strip()
    hoje = datetime.date.today()
    if 'Hoje' in texto:
        return texto.replace('Hoje', hoje.strftime('%d/%m'))
    if 'Ontem' in texto:
        ontem = hoje - datetime.timedelta(days=1)
        return texto.replace('Ontem', ontem.strftime('%d/%m'))
    match = re.search(r'(\d+) de ([a-z]+)', texto)
    if match:
        dia, mes_abr = match.group(1), match.group(2)
        mes_num = meses.get(mes_abr, mes_abr)
        return texto.replace(match.group(0), f'{dia.zfill(2)}/{mes_num}')
    return texto


def parse_preco(texto: str) -> Optional[float]:
    """Converte 'R$ 3.500' -> 3500.0. Retorna None se não der pra parsear."""
    if not texto:
        return None
    limpo = re.sub(r'[^\d,.]', '', texto)
    limpo = limpo.replace('.', '').replace(',', '.')
    try:
        return float(limpo)
    except ValueError:
        return None


def criar_extensao_proxy(host: str, porta: str, usuario: str, senha: str) -> str:
    """
    Gera uma extensão Chrome MV2 que autentica automaticamente no proxy.
    Necessário porque --proxy-server nativo do Chrome não aceita usuário/senha na URL.
    """
    manifest = {
        "version": "1.0.0",
        "manifest_version": 2,
        "name": "Proxy Auth Extension",
        "permissions": [
            "proxy", "tabs", "unlimitedStorage", "storage",
            "<all_urls>", "webRequest", "webRequestBlocking"
        ],
        "background": {"scripts": ["background.js"]},
        "minimum_chrome_version": "22.0.0"
    }

    background_js = f"""
    var config = {{
        mode: "fixed_servers",
        rules: {{
            singleProxy: {{
                scheme: "http",
                host: "{host}",
                port: parseInt({porta})
            }},
            bypassList: ["localhost"]
        }}
    }};
    chrome.proxy.settings.set({{value: config, scope: "regular"}}, function() {{}});

    chrome.webRequest.onAuthRequired.addListener(
        function(details) {{
            return {{authCredentials: {{username: "{usuario}", password: "{senha}"}}}};
        }},
        {{urls: ["<all_urls>"]}},
        ["blocking"]
    );
    """

    pasta_tmp = Path(tempfile.mkdtemp(prefix='proxy_ext_'))
    caminho_zip = pasta_tmp / 'proxy_auth.zip'

    with zipfile.ZipFile(caminho_zip, 'w') as zp:
        zp.writestr('manifest.json', json.dumps(manifest))
        zp.writestr('background.js', background_js)

    return str(caminho_zip)


def criar_driver(headless: bool = True, usar_proxy: bool = False) -> webdriver.Chrome:
    options = Options()

    if headless:
        options.add_argument('--headless=new')

    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--no-sandbox')             # necessário rodando como root em VPS/container
    options.add_argument('--disable-dev-shm-usage')  # evita crash por pouco /dev/shm em VPS pequenas
    options.page_load_strategy = 'eager'             # não espera CSS/imagens/fontes

    # Bloqueia imagens: maior economia de banda/proxy (~10x menos tráfego)
    prefs = {"profile.managed_default_content_settings.images": 2}
    options.add_experimental_option('prefs', prefs)

    # Evita detecção como bot
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    if usar_proxy:
        caminho_extensao = criar_extensao_proxy(PROXY_HOST, PROXY_PORT, PROXY_USER, PROXY_SENHA)
        options.add_extension(caminho_extensao)

    driver = webdriver.Chrome(options=options)

    # Bloqueia CSS/fontes via CDP (prefs do Chrome só cobrem imagens, não CSS)
    driver.execute_cdp_cmd('Network.enable', {})
    driver.execute_cdp_cmd('Network.setBlockedURLs', {
        'urls': ['*.css', '*.woff', '*.woff2', '*.ttf', '*.otf']
    })

    return driver


class SemMaisResultados(Exception):
    """Sinaliza que o OLX não tem mais anúncios para essa busca (fim da paginação)."""
    pass



def descobrir_ultima_pagina(driver) -> Optional[int]:
    """
    Descobre o número da última página disponível na busca do OLX.

    Estratégia 1 (mais confiável): procura o <a> cujo texto visível é
    "Última página" — independente do hash da classe CSS.

    Estratégia 2 (fallback): varre todos os <a> da página que contenham
    o parâmetro ?o= no href e retorna o maior número encontrado.
    """
    try:
        # Aguarda ao menos um link de paginação aparecer
        wait = WebDriverWait(driver, 20)
        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//a[contains(@href,'?o=') or contains(@href,'&o=')]")
        ))
        sleep(0.5)  # pequena margem para todos os links renderizarem

        # ── Estratégia 1: link com texto "Última página" ──────────────────────
        candidatos = driver.find_elements(
            By.XPATH, "//a[contains(translate(text(),'ÚÁÉÍÓ','uaeio'),'ltima p')]"
        )
        logger.info(f'[paginação] Estratégia 1: {len(candidatos)} candidato(s) encontrado(s) para "Última página"')
        for c in candidatos:
            logger.info(f'  texto="{c.text}" href="{c.get_attribute("href")}"')

        if candidatos:
            href = candidatos[-1].get_attribute('href') or ''
            m = re.search(r'[?&]o=(\d+)', href)
            if m:
                logger.info(f'Última página detectada pelo botão "Última página": o={m.group(1)}')
                return int(m.group(1))

        # ── Estratégia 2: maior valor de ?o= entre todos os links da página ──
        todos_links = driver.find_elements(By.TAG_NAME, 'a')
        numeros = []
        for a in todos_links:
            href = a.get_attribute('href') or ''
            m = re.search(r'[?&]o=(\d+)', href)
            if m:
                numeros.append(int(m.group(1)))
        logger.info(f'[paginação] Estratégia 2: valores de ?o= encontrados: {sorted(set(numeros))}')
        if numeros:
            ultima = max(numeros)
            logger.info(f'Última página detectada pelo maior o= nos links: {ultima}')
            return ultima

    except Exception as e:
        logger.warning(f'Não foi possível descobrir a última página: {e}')
    return None


def raspar_pagina(driver, condicao: str) -> list[dict]:
    """Extrai todos os anúncios da página atual."""
    if driver.find_elements(By.XPATH, "//div[contains(@class,'AdNotFound')]"):
        raise SemMaisResultados()

    wait = WebDriverWait(driver, 30)
    wait.until(EC.presence_of_element_located((By.XPATH, "//a[@class='olx-adcard__link']")))
    sleep(random.uniform(1, 2))  # pequena pausa para JS terminar de renderizar

    titulos = driver.find_elements(By.XPATH, "//h2[contains(@class,'olx-adcard__title')]")
    precos  = driver.find_elements(By.XPATH, "//h3[contains(@class,'olx-adcard__price')]")
    locais  = driver.find_elements(By.XPATH, "//p[contains(@class,'olx-adcard__location')]")
    datas   = driver.find_elements(By.XPATH, "//p[contains(@class,'olx-adcard__date')]")
    imagens = driver.find_elements(By.XPATH, "//source[@type='image/jpeg']")
    links   = driver.find_elements(By.XPATH, "//a[@class='olx-adcard__link']")

    anuncios = []
    for i, link in enumerate(links):
        preco_raw = precos[i].text if i < len(precos) else ''
        anuncio = {
            'Titulo':    titulos[i].text                    if i < len(titulos) else '',
            'Preco':     parse_preco(preco_raw),
            'Preco_Raw': preco_raw,
            'Local':     locais[i].text                     if i < len(locais)  else '',
            'Data':      normalizar_data(datas[i].text)     if i < len(datas)   else '',
            'Imagem':    imagens[i].get_attribute('srcset') if i < len(imagens) else '',
            'Link':      link.get_attribute('href'),
            'Condicao':  condicao,
        }
        anuncios.append(anuncio)
    return anuncios


def raspar_pagina_com_retry(driver, url: str, condicao: str) -> Optional[list[dict]]:
    """Carrega a URL e extrai os anúncios, com retry e backoff progressivo em caso de falha."""
    esperas = [0] + BACKOFF_SEGUNDOS  # 1ª tentativa não espera nada antes
    total_tentativas = len(esperas)

    for tentativa, espera in enumerate(esperas, start=1):
        if espera:
            logger.warning(f'Retry {tentativa - 1}/{len(BACKOFF_SEGUNDOS)} em {espera}s...')
            sleep(espera)
        try:
            driver.get(url)
            return raspar_pagina(driver, condicao)
        except SemMaisResultados:
            raise
        except TimeoutException:
            logger.error(f'Timeout ao carregar página (tentativa {tentativa}/{total_tentativas}): {url}')
        except WebDriverException as e:
            logger.error(f'Erro do WebDriver (tentativa {tentativa}/{total_tentativas}): {e}')
        except Exception as e:
            logger.error(f'Erro inesperado ao raspar página (tentativa {tentativa}/{total_tentativas}): {e}')

    return None


def slugify(texto: str) -> str:
    """Normaliza um texto para uso seguro em nome de arquivo (sem acento, espaço, %20 etc.)."""
    texto = texto.replace('%20', '-')
    texto = unicodedata.normalize('NFKD', texto).encode('ascii', 'ignore').decode('ascii')
    texto = re.sub(r'[^a-zA-Z0-9]+', '-', texto).strip('-').lower()
    return texto or 'sem-valor'


def gerar_nome_arquivo() -> str:
    """Gera um nome único por execução: busca-estado-condicao-data-hora.json"""
    timestamp = datetime.datetime.now().strftime('%d-%m-%Y-%H-%M-%S')
    partes = [slugify(BUSCA), slugify(ESTADO), slugify(CONDICAO), timestamp]
    return '-'.join(partes) + '.json'


def salvar_json(anuncios: list[dict], arquivo: str, resumo: Optional[dict] = None):
    """Salva os anúncios em JSON, com metadados da execução para facilitar o consumo no pipeline."""
    payload = {
        'gerado_em': datetime.datetime.now().isoformat(),
        'busca': BUSCA,
        'estado': ESTADO,
        'categoria': CATEGORIA,
        'condicao': CONDICAO,
        'total': len(anuncios),
        **(resumo or {}),
        'anuncios': anuncios,
    }
    with open(arquivo, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────
def main():
    driver = criar_driver(headless=HEADLESS, usar_proxy=USAR_PROXY)
    todos_anuncios = []
    falhas_consecutivas = 0
    paginas_ok = 0
    paginas_falhas = 0
    interrompida = False  # parou antes de percorrer todas as páginas planejadas

    categoria = CATEGORIAS[CATEGORIA]
    condicao_qs = '&'.join(f'{categoria["key"]}={numero}' for numero in CONDICOES[CONDICAO])

    paginas_limite = PAGINAS if PAGINAS else 1

    # ── Descobre a última página acessando a página 1 ──────────────────────────
    url_pagina1 = f'https://www.olx.com.br/{categoria["slug"]}/estado-{ESTADO}?q={BUSCA}&{condicao_qs}&o=1'
    logger.info(f'Acessando página 1 para descobrir a última página: {url_pagina1}')
    driver.get(url_pagina1)
    ultima_pagina = descobrir_ultima_pagina(driver)
    paginacao_detectada = ultima_pagina is not None

    if ultima_pagina is None:
        logger.warning('Não foi possível detectar a última página via paginação. Usando página 1 como ponto de partida.')
        ultima_pagina = 1

    # Respeita o limite configurado em PAGINAS
    pagina_inicio = ultima_pagina
    pagina_fim    = max(1, ultima_pagina - paginas_limite + 1)
    paginas_total = pagina_inicio - pagina_fim + 1

    logger.info(
        f'Iniciando: busca="{BUSCA}" categoria={CATEGORIA} condicao={CONDICAO} '
        f'ultima_pagina={ultima_pagina} raspando {paginas_total} pagina(s) '
        f'({pagina_inicio} -> {pagina_fim})'
    )

    try:
        for pagina in range(pagina_inicio, pagina_fim - 1, -1):  # última → primeira
            url = f'https://www.olx.com.br/{categoria["slug"]}/estado-{ESTADO}?q={BUSCA}&{condicao_qs}&o={pagina}'
            logger.info(f'[Pagina {pagina} | restam {pagina - pagina_fim} depois desta] {url}')

            try:
                resultado = raspar_pagina_com_retry(driver, url, CONDICAO)
            except SemMaisResultados:
                logger.info(f'Fim da paginação detectado na página {pagina} (sem mais anúncios) - encerrando.')
                # Raspando da última pra primeira: "sem resultados" com páginas ainda por vir
                # significa que as de menor número ficaram sem ser raspadas.
                if pagina > pagina_fim:
                    interrompida = True
                break

            if resultado is None:
                falhas_consecutivas += 1
                paginas_falhas += 1
                logger.error(f'Página {pagina} falhou após esgotar as tentativas '
                             f'(falhas consecutivas: {falhas_consecutivas}/{MAX_FALHAS_CONSECUTIVAS})')
                if falhas_consecutivas >= MAX_FALHAS_CONSECUTIVAS:
                    logger.critical(f'{MAX_FALHAS_CONSECUTIVAS} falhas consecutivas - abortando execução.')
                    interrompida = True
                    break
                continue

            anuncios = resultado

            falhas_consecutivas = 0
            paginas_ok += 1
            todos_anuncios.extend(anuncios)
            logger.info(f'OK: {len(anuncios)} anuncios encontrados na pagina {pagina}')
            for a in anuncios[:3]:
                logger.info(f'  -> {a["Titulo"]} | {a["Preco_Raw"]} | {a["Local"]} | {a["Data"]}')

            if pagina > pagina_fim:
                sleep(random.uniform(2, 5))  # delay humano entre páginas
    finally:
        driver.quit()

    # Sem paginação detectada e com uma página "cheia" (~50 anúncios), provavelmente
    # existem mais páginas que não foram vistas: não dá pra garantir a raspagem.
    paginacao_incerta = not paginacao_detectada and len(todos_anuncios) >= ANUNCIOS_PAGINA_CHEIA

    # "completo" = a raspagem viu TODOS os anúncios da busca. O worker só aplica strike
    # (anúncio sumiu) em cima de raspagem completa; parcial daria strike em anúncio vivo.
    resumo = {
        'paginas_planejadas': paginas_total,
        'paginas_raspadas': paginas_ok,
        'paginas_falhas': paginas_falhas,
        'completo': paginas_falhas == 0 and not interrompida and not paginacao_incerta,
    }

    Path(PASTA_SAIDA).mkdir(parents=True, exist_ok=True)
    caminho_arquivo = str(Path(PASTA_SAIDA) / gerar_nome_arquivo())
    salvar_json(todos_anuncios, caminho_arquivo, resumo)
    logger.info(f'Total: {len(todos_anuncios)} anuncios salvos em "{caminho_arquivo}" '
                f'(completo={resumo["completo"]}, paginas {paginas_ok}/{paginas_total}, falhas {paginas_falhas})')

    # Linha que o worker lê pra achar o arquivo (em vez de adivinhar "o JSON mais recente").
    print(f'RESULTADO_JSON={caminho_arquivo}', flush=True)


def ler_argumentos() -> argparse.Namespace:
    """Permite ao worker escolher o produto de cada execução. Sem argumentos, usa as constantes do topo."""
    p = argparse.ArgumentParser(description='Raspador do OLX (Selenium)')
    p.add_argument('--busca', help='termo de busca; use %%20 para espaços')
    p.add_argument('--estado', help='sigla do estado, ex: pe')
    p.add_argument('--categoria', choices=list(CATEGORIAS), help='categoria do OLX')
    p.add_argument('--condicao', choices=list(CONDICOES), help='condição do produto')
    p.add_argument('--paginas', type=int, help='quantas páginas raspar')
    p.add_argument('--headless', action='store_true', help='roda sem abrir janela')
    return p.parse_args()


if __name__ == '__main__':
    _args = ler_argumentos()
    if _args.busca is not None:
        BUSCA = _args.busca
    if _args.estado is not None:
        ESTADO = _args.estado
    if _args.categoria is not None:
        CATEGORIA = _args.categoria
    if _args.condicao is not None:
        CONDICAO = _args.condicao
    if _args.paginas is not None:
        PAGINAS = _args.paginas
    if _args.headless:
        HEADLESS = True
    main()
