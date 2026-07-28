from PIL import Image

img = Image.open('assets/updated_icon.png').convert('RGBA')
size = max(img.width, img.height)
square = Image.new('RGBA', (size, size), (0, 0, 0, 0))
square.paste(img, ((size - img.width) // 2, (size - img.height) // 2))
square.save('assets/updated_icon.png')
print(f'Done: {size}x{size}')
