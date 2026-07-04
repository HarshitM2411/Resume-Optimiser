from app.services.storage.html_extractor import extract_text_from_html


def test_extract_text_from_html_strips_script_and_style() -> None:
    html = """
    <html>
      <head>
        <style>body { color: red; }</style>
        <script>alert("x")</script>
      </head>
      <body>
        <h1>Senior Engineer</h1>
        <p>Build APIs with Python.</p>
      </body>
    </html>
    """

    text = extract_text_from_html(html)

    assert "alert" not in text
    assert "color: red" not in text
    assert "Senior Engineer" in text
    assert "Build APIs with Python." in text
    assert "  " not in text


def test_extract_text_from_html_normalizes_whitespace() -> None:
    html = "<div>Role:   Engineer\n\n\nLocation:  Remote</div>"

    text = extract_text_from_html(html)

    assert text == "Role: Engineer Location: Remote"
