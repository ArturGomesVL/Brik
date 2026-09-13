"""
OLX Scraper Aprimorado
Combina a robustez do Selenium (JavaScript renderizado) com as
boas práticas do pyolxbrazil: multipáginas, conversão de datas, dicionários.

Hardened para rodar sem supervisão em VPS: bloqueio de imagens/CSS,
proxy autenticado, retry com backoff, tolerância a falha por página,
output em JSON e logging estruturado.
"""
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
PAGINAS      = 10          # quantas páginas raspar (None = só a 1ª)

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


def extrair_total_anuncios(driver) -> Optional[int]:
    """
    Lê o contador de total de anúncios da busca (div TotalOfAds) e devolve
    como int. Usado para parar a paginação exatamente onde os resultados
    acabam, já que o OLX às vezes não mostra a div "sem resultados" e
    simplesmente devolve anúncios fora do filtro quando a página pedida
    não existe mais.
    """
    elementos = driver.find_elements(By.XPATH, "//div[contains(@class,'TotalOfAds')]//p")
    if not elementos:
        return None
    # Texto no formato "1 - 50 de 201 resultados" - queremos só o número depois do "de".
    match = re.search(r'de\s+([\d.]+)', elementos[0].text, re.IGNORECASE)
    if not match:
        return None
    digitos = match.group(1).replace('.', '')
    return int(digitos) if digitos.isdigit() else None


def raspar_pagina(driver, condicao: str) -> tuple[list[dict], Optional[int]]:
    """Extrai todos os anúncios da página atual e o total de anúncios da busca."""
    if driver.find_elements(By.XPATH, "//div[contains(@class,'AdNotFound')]"):
        raise SemMaisResultados()

    wait = WebDriverWait(driver, 30)
    wait.until(EC.presence_of_element_located((By.XPATH, "//a[@class='olx-adcard__link']")))
    sleep(random.uniform(1, 2))  # pequena pausa para JS terminar de renderizar

    total_anuncios = extrair_total_anuncios(driver)

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
    return anuncios, total_anuncios


def raspar_pagina_com_retry(driver, url: str, condicao: str) -> Optional[tuple[list[dict], Optional[int]]]:
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


def salvar_json(anuncios: list[dict], arquivo: str):
    """Salva os anúncios em JSON, com metadados da execução para facilitar o consumo no pipeline."""
    payload = {
        'gerado_em': datetime.datetime.now().isoformat(),
        'busca': BUSCA,
        'estado': ESTADO,
        'categoria': CATEGORIA,
        'condicao': CONDICAO,
        'total': len(anuncios),
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
    total_anuncios_busca = None

    categoria = CATEGORIAS[CATEGORIA]
    condicao_qs = '&'.join(f'{categoria["key"]}={numero}' for numero in CONDICOES[CONDICAO])

    paginas = PAGINAS if PAGINAS else 1
    logger.info(f'Iniciando: busca="{BUSCA}" categoria={CATEGORIA} condicao={CONDICAO} paginas={paginas}')

    try:
        for pagina in range(1, paginas + 1):
            url = f'https://www.olx.com.br/{categoria["slug"]}/estado-{ESTADO}?q={BUSCA}&{condicao_qs}&o={pagina}'
            logger.info(f'[Pagina {pagina}/{paginas}] {url}')

            try:
                resultado = raspar_pagina_com_retry(driver, url, CONDICAO)
            except SemMaisResultados:
                logger.info(f'Fim da paginação detectado na página {pagina} (sem mais anúncios) - encerrando.')
                break

            if resultado is None:
                falhas_consecutivas += 1
                logger.error(f'Página {pagina} falhou após esgotar as tentativas '
                             f'(falhas consecutivas: {falhas_consecutivas}/{MAX_FALHAS_CONSECUTIVAS})')
                if falhas_consecutivas >= MAX_FALHAS_CONSECUTIVAS:
                    logger.critical(f'{MAX_FALHAS_CONSECUTIVAS} falhas consecutivas - abortando execução.')
                    break
                continue

            anuncios, total_pagina = resultado
            if total_pagina is not None:
                total_anuncios_busca = total_pagina

            falhas_consecutivas = 0
            todos_anuncios.extend(anuncios)
            logger.info(f'OK: {len(anuncios)} anuncios encontrados na pagina {pagina}')
            for a in anuncios[:3]:
                logger.info(f'  -> {a["Titulo"]} | {a["Preco_Raw"]} | {a["Local"]} | {a["Data"]}')

            if total_anuncios_busca is not None and len(todos_anuncios) >= total_anuncios_busca:
                logger.info(f'Total de {total_anuncios_busca} anúncios da busca já raspados '
                             f'(contador do OLX) - encerrando antes de sair do range real.')
                break

            if pagina < paginas:
                sleep(random.uniform(2, 5))  # delay humano entre páginas
    finally:
        driver.quit()

    Path(PASTA_SAIDA).mkdir(parents=True, exist_ok=True)
    caminho_arquivo = str(Path(PASTA_SAIDA) / gerar_nome_arquivo())
    salvar_json(todos_anuncios, caminho_arquivo)
    logger.info(f'Total: {len(todos_anuncios)} anuncios salvos em "{caminho_arquivo}"')


if __name__ == '__main__':
    main()
