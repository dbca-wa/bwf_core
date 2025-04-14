from bwf_core.tasks import start_workflow
from bwf_core.models import Workflow, WorkFlowInstance


def init_workflow(workflow_id: int, input_data: dict) -> WorkFlowInstance:
    # Placeholder function to simulate starting a workflow
    instance = start_workflow(workflow_id, input_data)
    return instance

def get_workflow_instance_current_status(instance_id: int) -> dict:
    # Placeholder function to simulate getting the current status of a workflow instance
    try:
        instance = WorkFlowInstance.objects.get(id=instance_id)
        return {
            "id": instance.id,
            "status": instance.status,
            "created_at": instance.created_at,
        }
    except WorkFlowInstance.DoesNotExist:
        return None
    

def get_workflow_definition(workflow_id: int) -> dict:
    # Placeholder function to simulate getting the workflow definition
    try:
        instance = Workflow.objects.get(id=workflow_id)
        workflow_definition = instance.get_json_definition()
        workflow_inputs = workflow_definition.get("inputs", {})
        inputs = []
        for key, input in workflow_inputs.items():
            inputs.append({
                "name": input.get("name"),
                "key": input.get("key"),
                "data_type": input.get("data_type"),
                "description": input.get("description"),
                "default_value": input.get("default_value", {}).get("value"),
                "required": input.get("required"),
            })
        return {
            "id": instance.id,
            "created_at": instance.created_at,
            "inputs": inputs,

        }
    except WorkFlowInstance.DoesNotExist:
        return None