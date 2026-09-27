/**
 * Recorta a imagem no centro (quadrado) e reduz pra `size` px antes de enviar.
 * Assim a foto fica com uns 15-30 KB e pode ser guardada direto no banco.
 */
export async function squareThumbnail(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  if (file.size > 15 * 1024 * 1024) throw new Error('A imagem é grande demais (máximo de 15 MB).')

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível abrir essa imagem.')
  })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff' // PNG com transparência não fica com fundo preto no JPEG
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
