from django.template import engines
from bwf_core import exceptions as bwf_exceptions
import json
import logging

logger = logging.getLogger(__name__)


class ComponentDto:
    def __init__(
        self,
        id,
        name,
        plugin_id,
        version_number,
        config,
        conditions,
        workflow_context={},
    ):
        self.id = id
        self.name = name
        self.plugin_id = plugin_id
        self.version_number = version_number
        self.inputs = {}
        self.outputs = {}
        self.config = config
        self.conditions = conditions
        self.workflow_context = workflow_context

    def get_inputs(self):
        if not self.inputs:
            self.inputs = eval_inputs(
                self.config["inputs"], self.workflow_context, plugin_id=self.plugin_id
            )
        return self.inputs


def eval_inputs(component_inputs, workflow_context={}, plugin_id=""):
    from bwf_core.components.utils import evaluate_expression
    inputs_evaluated = {}
    for input in component_inputs:
        data_type = input.get("data_type", None)
        try:
            new_input = {
                "key": input["key"],
                "value": None,
            }
            if not input["value"]:
                pass
            elif input["json_value"].get("multi", False):
                if isinstance(input["value"], list):
                    new_input["value"] = []
                    for fields in input["value"]:
                        fields_list = []
                        for field in fields:
                            fields_list.append(fields[field])
                        new_input["value"].append(
                            eval_inputs(fields_list, workflow_context)
                        )
            elif input["value"]["is_expression"]:
                expression = input["value"].get("value", "")
                new_input["value"] = evaluate_expression(expression, data_type, workflow_context)
            elif input["value"]["value_ref"]:
                value_ref = input["value"]["value_ref"]
                # TODO: validate context value
                id = value_ref.get("id", None)
                key = value_ref.get("key", None)
                param = id if id else key if key else None
                if not param:
                    raise Exception("Invalid value reference")
                new_input["value"] = workflow_context[value_ref["context"]].get(
                    param, None
                )
            else:
                new_input["value"] = input["value"]["value"]
            inputs_evaluated[new_input["key"]] = new_input["value"]
        except Exception as e:
            raise bwf_exceptions.ComponentInputsEvaluationException(
                f"Error evaluating input in plugin '{plugin_id}' value for '{input['key']}': {str(e)}",
                input["key"],
            )
    return inputs_evaluated
