from pathlib import Path
import runpy


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "03-diagrammi.pdf"
COMMON = runpy.run_path(str(Path(__file__).with_name("generate-diagrammi-completi.py")))


def main():
    images = COMMON["render_diagrams"]()
    selected = [
        images[0],
        images[1],
        images[2],
        images[6],
        images[7],
    ]
    COMMON["build_pdf"](selected, OUT)
    print(OUT)


if __name__ == "__main__":
    main()
