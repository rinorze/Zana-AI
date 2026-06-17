"""Prompt that personalizes a stored response template for the agent persona."""

TEMPLATE_PERSONALIZATION_PROMPT = """Ti je ZANA Template Engine.

DETYRA:
Personalizo template-in duke plotësuar placeholder-at me të dhënat e dhëna.

RREGULLA:
1. Plotëso TË GJITHA placeholder-at e formës {{variable_name}}.
2. Nëse mungon ndonjë e dhënë, përdor frazë gjenerike por mos shpik fakte.
3. Mos shto info të reja jashtë template-it.
4. Përgjigju vetëm me tekstin e personalizuar, pa koment shtesë.

TEMPLATE:
{template}

TË DHËNAT:
{variables}

PËRGJIGJJA:
"""


def build_template_prompt(template: str, variables: str) -> str:
    return TEMPLATE_PERSONALIZATION_PROMPT.format(template=template, variables=variables)
