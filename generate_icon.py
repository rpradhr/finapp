from PIL import Image, ImageDraw, ImageFont
import os
import struct
import io

def create_icon(size):
    """Create a modern flat finance app icon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Padding for rounded square
    pad = int(size * 0.05)

    # Draw rounded rectangle background with gradient effect
    # Base: rich green gradient
    for y in range(pad, size - pad):
        ratio = (y - pad) / (size - 2 * pad)
        r = int(16 + ratio * 10)
        g = int(150 - ratio * 30)
        b = int(72 + ratio * 20)
        draw.rectangle([pad, y, size - pad - 1, y], fill=(r, g, b, 255))

    # Round the corners by masking
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    corner_radius = int(size * 0.22)
    mask_draw.rounded_rectangle([pad, pad, size - pad - 1, size - pad - 1],
                                radius=corner_radius, fill=255)
    img.putalpha(mask)

    # Draw a subtle lighter area at top for depth
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    highlight_height = int(size * 0.35)
    for y in range(pad, pad + highlight_height):
        alpha = int(40 * (1 - (y - pad) / highlight_height))
        overlay_draw.rectangle([pad, y, size - pad - 1, y], fill=(255, 255, 255, alpha))

    img = Image.alpha_composite(img, overlay)
    # Re-apply mask
    img.putalpha(mask)

    draw = ImageDraw.Draw(img)

    # Draw a small chart icon (3 bars) in the upper portion
    bar_area_top = int(size * 0.22)
    bar_area_bottom = int(size * 0.52)
    bar_width = int(size * 0.08)
    bar_gap = int(size * 0.05)
    bar_count = 3
    total_bar_width = bar_count * bar_width + (bar_count - 1) * bar_gap
    bar_start_x = (size - total_bar_width) // 2

    bar_heights = [0.5, 0.8, 0.65]  # relative heights

    for i, h in enumerate(bar_heights):
        x = bar_start_x + i * (bar_width + bar_gap)
        bar_h = int((bar_area_bottom - bar_area_top) * h)
        y_top = bar_area_bottom - bar_h
        # White semi-transparent bars
        for y in range(y_top, bar_area_bottom):
            draw.rectangle([x, y, x + bar_width, y], fill=(255, 255, 255, 200))
        # Rounded top
        if bar_width > 4:
            r = bar_width // 2
            draw.ellipse([x, y_top - r//2, x + bar_width, y_top + r//2], fill=(255, 255, 255, 200))

    # Draw "$" symbol below the bars
    dollar_y = int(size * 0.55)
    font_size = int(size * 0.35)

    try:
        # Try system fonts
        for font_path in [
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/SFNSDisplay.ttf",
            "/System/Library/Fonts/SFNS.ttf",
            "/Library/Fonts/Arial.ttf",
        ]:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, font_size)
                break
        else:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # Draw dollar sign centered
    text = "$"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = (size - text_w) // 2
    text_y = dollar_y

    # White dollar sign with slight shadow
    draw.text((text_x + 1, text_y + 1), text, fill=(0, 80, 40, 80), font=font)
    draw.text((text_x, text_y), text, fill=(255, 255, 255, 240), font=font)

    # Re-apply mask one final time
    img.putalpha(mask)

    return img

def create_icns(png_dict, output_path):
    """Create .icns file from dict of {size: PIL.Image}"""
    # macOS icns format
    icns_types = {
        16: b'icp4',   # 16x16
        32: b'icp5',   # 32x32
        64: b'icp6',   # 64x64
        128: b'ic07',  # 128x128
        256: b'ic08',  # 256x256
        512: b'ic09',  # 512x512
        1024: b'ic10', # 1024x1024
    }

    entries = []
    for size, icon_type in icns_types.items():
        if size in png_dict:
            buf = io.BytesIO()
            png_dict[size].save(buf, format='PNG')
            png_data = buf.getvalue()
            entry_size = len(png_data) + 8
            entries.append(struct.pack('>4sI', icon_type, entry_size) + png_data)

    body = b''.join(entries)
    total_size = len(body) + 8
    icns_data = struct.pack('>4sI', b'icns', total_size) + body

    with open(output_path, 'wb') as f:
        f.write(icns_data)

# Generate all sizes
icon_dir = '/Users/rahul.pradhan/AppDev/FinApp/src-tauri/icons'
os.makedirs(icon_dir, exist_ok=True)

sizes = [32, 64, 128, 256, 512, 1024]
png_dict = {}

for s in sizes:
    img = create_icon(s)
    png_dict[s] = img
    img.save(os.path.join(icon_dir, f'{s}x{s}.png'))
    print(f'Created {s}x{s}.png')

# Save standard names Tauri expects
png_dict[256].save(os.path.join(icon_dir, 'icon.png'))
png_dict[32].save(os.path.join(icon_dir, '32x32.png'))
png_dict[128].save(os.path.join(icon_dir, '128x128.png'))
png_dict[128].resize((256, 256), Image.LANCZOS).save(os.path.join(icon_dir, '128x128@2x.png'))

# Create .icns for macOS
icns_path = os.path.join(icon_dir, 'icon.icns')
create_icns(png_dict, icns_path)
print(f'Created icon.icns')

# Also create .ico for Windows (just in case)
ico_images = []
for s in [16, 32, 48, 64, 128, 256]:
    if s in png_dict:
        ico_images.append(png_dict[s].resize((s, s), Image.LANCZOS))
    elif s < min(png_dict.keys()):
        ico_images.append(png_dict[min(png_dict.keys())].resize((s, s), Image.LANCZOS))

ico_path = os.path.join(icon_dir, 'icon.ico')
ico_images[0].save(ico_path, format='ICO', sizes=[(img.width, img.height) for img in ico_images], append_images=ico_images[1:])
print(f'Created icon.ico')

print('\nAll icons generated successfully!')
