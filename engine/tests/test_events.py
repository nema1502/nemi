from PIL import Image

from nemi import events as ev

# One flat color per cell of the 3x3 grid, read left to right, top to bottom
COLORS = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255), (0, 255, 255),
          (128, 0, 0), (0, 128, 0), (0, 0, 128)]


def test_grid_posts_come_out_in_posting_order(tmp_path):
    """Instagram shows the newest post top-left, so post 1 is the bottom-right cell and post 9 the top-left."""
    grid = Image.new("RGB", (30, 45))  # portrait, so a swapped width and height would show
    for cell, color in enumerate(COLORS):
        x, y = (cell % 3) * 10, (cell // 3) * 15
        grid.paste(color, (x, y, x + 10, y + 15))
    grid.save(tmp_path / "grid-full.png")

    posts = ev._tiles(tmp_path / "grid-full.png", tmp_path)

    assert [p.name for p in posts] == [f"instagram-post-{n}.png" for n in range(1, 10)]
    tiles = [Image.open(p).convert("RGB") for p in posts]
    assert all(t.size == (10, 15) for t in tiles)
    # every tile is exactly one cell: a single flat color
    assert [t.getcolors() for t in tiles] == [[(150, c)] for c in reversed(COLORS)]
    assert tiles[0].getpixel((0, 0)) == COLORS[8]  # post 1: bottom-right
    assert tiles[2].getpixel((0, 0)) == COLORS[6]  # post 3: bottom-left
    assert tiles[6].getpixel((0, 0)) == COLORS[2]  # post 7: top-right
    assert tiles[8].getpixel((0, 0)) == COLORS[0]  # post 9: top-left, the newest
