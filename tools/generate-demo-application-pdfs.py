"""Build fictional, visibly marked PDFs for the browser-local application demo."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "src/DeepSprout.Web/wwwroot/assets/demo/application-documents"
DOCUMENTS = {
    "app-bright": ("Bright Minds Academy", ["registration-certificate.pdf", "board-letter.pdf"]),
    "app-reads": ("Amman Reads Library", ["library-license.pdf"]),
    "app-irbid": ("Irbid Youth Hub", ["hub-registration.pdf"]),
    "app-horizon": ("Horizon Youth Center", ["organization-profile.pdf"]),
    "app-maya": ("Maya Haddad", ["mentor-profile.pdf"]),
}


def make_pdf(path: Path, institution: str, filename: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    width, height = A4
    pdf.setTitle(f"Sample document - {filename}")
    pdf.setAuthor("DeepSprout local demo")
    pdf.setFillColor(colors.HexColor("#F7F8F2"))
    pdf.rect(0, 0, width, height, stroke=0, fill=1)
    pdf.setFillColor(colors.HexColor("#173C33"))
    pdf.setFont("Helvetica-Bold", 17)
    pdf.drawString(52, height - 72, "DeepSprout")
    pdf.setStrokeColor(colors.HexColor("#CFDCCC"))
    pdf.line(52, height - 91, width - 52, height - 91)
    pdf.setFont("Helvetica-Bold", 27)
    pdf.drawString(52, height - 150, "DEMONSTRATION SAMPLE")
    pdf.setFont("Helvetica", 13)
    pdf.drawString(52, height - 185, institution)
    pdf.setFillColor(colors.HexColor("#52665D"))
    pdf.setFont("Helvetica", 11)
    pdf.drawString(52, height - 217, f"Displayed filename: {filename}")
    pdf.drawString(52, height - 252, "This file is fictional and contains no registration evidence.")
    pdf.drawString(52, height - 271, "It exists only to demonstrate the document download control.")
    pdf.setStrokeColor(colors.HexColor("#CFDCCC"))
    pdf.line(52, 75, width - 52, 75)
    pdf.setFillColor(colors.HexColor("#52665D"))
    pdf.setFont("Helvetica", 9)
    pdf.drawString(52, 54, "Local development fixture - not an official document")
    pdf.showPage()
    pdf.save()


if __name__ == "__main__":
    for application_id, (institution, filenames) in DOCUMENTS.items():
        for filename in filenames:
            make_pdf(DEST / application_id / filename, institution, filename)
