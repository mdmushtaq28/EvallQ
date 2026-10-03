import time
from typing import AsyncGenerator, Optional, Dict, Any, List
import httpx
from ...core.config import settings
from .base import LocalLLMProvider, ModelNotInitializedError


EVALLQ_TUTOR_SYSTEM_PROMPT = (
    "You are EvallQ AI Tutor, a private on-device academic study companion for students.\n"
    "Your mission is to help students learn effectively through clear explanations, intuition-building, and practical examples.\n\n"
    "Core Guidelines:\n"
    "1. Be concise, encouraging, and pedagogically sound.\n"
    "2. Break complex topics into clear, digestible steps.\n"
    "3. Use code blocks, math, or analogies where helpful.\n"
    "4. If a concept has common pitfalls, highlight them gently.\n"
    "5. All reasoning and answers run 100% locally and privately on this PC."
)


class DevelopmentLLMProvider(LocalLLMProvider):
    """
    Local development LLM provider running on Host CPU / x86_64 via Ollama.
    Truthfully reports CPU execution and measured on-device latency.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.model_name = model_name or settings.LLM_MODEL
        self.base_url = (base_url or settings.LLM_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.LLM_TIMEOUT_SECONDS
        self.device = settings.LLM_DEV_DEVICE
        self._last_health_check: Optional[float] = None
        self._cached_status: bool = False

    async def check_runtime_health(self) -> bool:
        """
        Polls the local runtime endpoint to see if Ollama is listening
        and the designated model is installed.
        """
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    # Check exact match or prefix (e.g., 'qwen2.5:0.5b' matches 'qwen2.5:0.5b-instruct')
                    target = self.model_name.lower()
                    base_target = target.split(":")[0]
                    model_found = any(
                        target in m.lower() or (base_target in m.lower() and "0.5b" in m.lower())
                        for m in models
                    )
                    self._cached_status = model_found
                    return model_found
        except Exception:
            pass

        self._cached_status = False
        return False

    def is_initialized(self) -> bool:
        return self._cached_status

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "ready" if self._cached_status else "not_initialized",
            "provider": "Development (Host CPU)",
            "model": self.model_name,
            "device": self.device,
            "runtime": "Ollama Local Engine",
            "endpoint": self.base_url,
            "offline": True,
            "target_upgrade": "On-Device Acceleration Engine"
        }

    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        max_tokens: int = 512,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Executes real local inference via Ollama /api/chat.
        """
        # Format conversation messages
        full_system = system_prompt or EVALLQ_TUTOR_SYSTEM_PROMPT
        payload_messages = [{"role": "system", "content": full_system}]

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in {"user", "assistant", "system"} and content.strip():
                payload_messages.append({"role": role, "content": content.strip()})

        options_dict: Dict[str, Any] = {
            "temperature": kwargs.get("temperature", 0.7),
            "num_predict": max_tokens,
        }
        if "repeat_penalty" in kwargs and kwargs["repeat_penalty"] is not None:
            options_dict["repeat_penalty"] = float(kwargs["repeat_penalty"])

        payload: Dict[str, Any] = {
            "model": self.model_name,
            "messages": payload_messages,
            "stream": False,
            "options": options_dict,
        }

        if kwargs.get("json_format", False):
            payload["format"] = "json"

        t_start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                t_end = time.perf_counter()

                if res.status_code == 404:
                    raise ModelNotInitializedError(
                        f"Model '{self.model_name}' was not found in the local runner. Please run: ollama pull {self.model_name}"
                    )
                elif res.status_code != 200:
                    raise ModelNotInitializedError(
                        f"Local LLM runtime error (HTTP {res.status_code}): {res.text}"
                    )

                data = res.json()
                reply = data.get("message", {}).get("content", "").strip()
                latency_ms = int((t_end - t_start) * 1000)

                eval_count = data.get("eval_count")
                eval_duration = data.get("eval_duration")
                tok_per_sec = None
                if eval_count and eval_duration and eval_duration > 0:
                    tok_per_sec = round(eval_count / (eval_duration / 1e9), 1)

                self._cached_status = True

                return {
                    "reply": reply,
                    "model": self.model_name,
                    "provider": "Development (Host CPU)",
                    "device": self.device,
                    "latency_ms": latency_ms,
                    "tokens_per_second": tok_per_sec,
                    "offline": True,
                }
        except httpx.ConnectError:
            self._cached_status = False
            raise ModelNotInitializedError(
                f"Local LLM service is offline at {self.base_url}. Ensure Ollama is running locally."
            )
        except httpx.TimeoutException:
            raise ModelNotInitializedError(
                f"Inference request timed out after {self.timeout}s on {self.device}."
            )

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 512) -> str:
        res = await self.generate_chat(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=system_prompt,
            max_tokens=max_tokens,
        )
        return res["reply"]

    async def stream(self, prompt: str, system_prompt: Optional[str] = None) -> AsyncGenerator[str, None]:
        if not self._cached_status:
            raise ModelNotInitializedError("Local LLM model is not initialized.")
        # Future streaming generator
        if False:
            yield ""


class OnDeviceLLMProvider(LocalLLMProvider):
    """
    On-device LLM provider configuration for local acceleration.
    """

    def __init__(self):
        self.model_name = "Qwen2.5-0.5B-Instruct"
        self.device = "Local AI Engine"
        self.target_platform = "On-Device Engine"

    def is_initialized(self) -> bool:
        return False

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "standby",
            "provider": "Local Engine",
            "model": self.model_name,
            "device": self.device,
            "target_platform": self.target_platform,
            "runtime": "ONNX Runtime / Ollama",
            "offline": True,
            "message": "Local on-device execution standby."
        }

    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        max_tokens: int = 512,
    ) -> Dict[str, Any]:
        raise ModelNotInitializedError("On-device engine standby. Use the active local provider.")

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 512) -> str:
        raise ModelNotInitializedError("On-device engine standby.")

    async def stream(self, prompt: str, system_prompt: Optional[str] = None) -> AsyncGenerator[str, None]:
        raise ModelNotInitializedError("On-device engine standby.")
        if False:
            yield ""


# Primary service instance
development_llm_provider = DevelopmentLLMProvider()
on_device_llm_provider = OnDeviceLLMProvider()

# Backwards compatibility aliases
LocalLLMService = DevelopmentLLMProvider
local_llm_service = development_llm_provider


def get_active_llm_provider() -> LocalLLMProvider:
    return development_llm_provider
