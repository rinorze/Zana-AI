"""Prompt builders for each ZANA persona."""
from app.llm.prompts.agent import AGENT_SUGGESTION_PROMPT, build_agent_system
from app.llm.prompts.citizen import (
    CITIZEN_SYSTEM_PROMPT,
    SIMPLE_MODE_ADDITION,
    build_citizen_system,
)
from app.llm.prompts.summary import SUMMARY_PROMPT, build_summary_prompt
from app.llm.prompts.template import TEMPLATE_PERSONALIZATION_PROMPT, build_template_prompt

__all__ = [
    "CITIZEN_SYSTEM_PROMPT",
    "SIMPLE_MODE_ADDITION",
    "build_citizen_system",
    "AGENT_SUGGESTION_PROMPT",
    "build_agent_system",
    "TEMPLATE_PERSONALIZATION_PROMPT",
    "build_template_prompt",
    "SUMMARY_PROMPT",
    "build_summary_prompt",
]
