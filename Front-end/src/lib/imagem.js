// Foto de celular chega com 3–8 MB. Antes de subir para o Storage, reduz para
// no máximo `lado` px no maior lado e regrava em JPEG — fica com poucas centenas
// de KB e dentro do limite dos buckets. Se o navegador não conseguir ler a
// imagem (formato exótico), devolve o arquivo original e o bucket decide.
export async function comprimirImagem(arquivo, lado = 1600, qualidade = 0.85) {
  try {
    const bitmap = await createImageBitmap(arquivo)
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade))
    return blob ?? arquivo
  } catch {
    return arquivo
  }
}
