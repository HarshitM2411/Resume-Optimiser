class AppError(Exception):
    status_code: int = 500
    message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None) -> None:
        if message is not None:
            self.message = message
        super().__init__(self.message)


class FileTooLargeError(AppError):
    status_code = 413
    message = "File exceeds 5MB limit."


class UnsupportedFormatError(AppError):
    status_code = 415
    message = "Unsupported file type."


class PasswordProtectedPDFError(AppError):
    status_code = 422
    message = "PDF is password-protected. Please upload an unlocked copy."


class CorruptedPDFError(AppError):
    status_code = 422
    message = "PDF is corrupted or could not be read. Please upload a valid file."


class ScannedPDFError(AppError):
    status_code = 422
    message = "This PDF appears to be a scanned image. Please upload a text-based PDF."


class InvalidTextEncodingError(AppError):
    status_code = 422
    message = "Text file must be UTF-8 encoded."


class LLMExhaustedError(AppError):
    status_code = 502
    message = "Parsing failed. Please try again or re-upload."


class URLFetchError(AppError):
    status_code = 422
    message = "URL could not be fetched. Please paste the job description text."


class SSRFError(URLFetchError):
    pass


class PDFCompilationError(AppError):
    status_code = 500
    message = "PDF generation failed. Please review your edits and try downloading again."
