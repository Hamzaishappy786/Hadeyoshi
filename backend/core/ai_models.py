_whisper_model = None


def load_whisper():
    global _whisper_model
    try:
        from faster_whisper import WhisperModel
        _whisper_model = WhisperModel("base.en", device="cpu", compute_type="int8")
        print("[AI] Whisper model loaded (base.en)")
    except Exception as e:
        print(f"[AI] Whisper unavailable: {e}")


def get_whisper_model():
    if _whisper_model is None:
        load_whisper()
    if _whisper_model is None:
        raise RuntimeError("Whisper model not loaded")
    return _whisper_model
