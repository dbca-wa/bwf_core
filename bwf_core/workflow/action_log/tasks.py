from bwf_core.models import ActionLog, ActionLogStatusEnum as enum
import logging

logger = logging.getLogger(__name__)

def record_log(component_instance=None, workflow_instance=None, status=enum.PENDING, error_message=None):
    wf_instance = component_instance.workflow if component_instance else workflow_instance
    try:
        ActionLog.objects.create(
            workflow_instance=wf_instance,
            component_instance=component_instance,
            status=status,
            error_message=error_message
        )
    except Exception as e:
        logger.error(e)
    
def record_component_error(component_instance, error_message=None):
    record_log(component_instance=component_instance, status=enum.ERROR, error_message=error_message)

def record_component_pending(component_instance):
    record_log(component_instance=component_instance, status=enum.PENDING)

def record_component_started(component_instance):
    record_log(component_instance=component_instance, status=enum.STARTED)

def record_stopped_log(component_instance=None, error_message=None):
    record_log(component_instance=component_instance, status=enum.STOPPED)

def record_component_restarted(component_instance):
    record_log(component_instance=component_instance, status=enum.RESTARTED)

def record_component_success(component_instance):
    record_log(component_instance=component_instance, status=enum.SUCCESS)

def record_workflow_error(workflow_instance, error_message=None):
    record_log(workflow_instance=workflow_instance, status=enum.ERROR, error_message=error_message)

def record_workflow_terminated(workflow_instance, error_message=None):
    record_log(workflow_instance=workflow_instance, status=enum.TERMINATED, error_message=error_message)

def record_workflow_pending(workflow_instance):
    record_log(workflow_instance=workflow_instance, status=enum.PENDING)

def record_workflow_started(workflow_instance):
    record_log(workflow_instance=workflow_instance, status=enum.STARTED)

def record_workflow_stopped(workflow_instance, error_message=None):
    record_log(workflow_instance=workflow_instance, status=enum.STOPPED, error_message=error_message)

def record_workflow_restarted(workflow_instance):
    record_log(workflow_instance=workflow_instance, status=enum.RESTARTED)

def record_workflow_success(workflow_instance):
    record_log(workflow_instance=workflow_instance, status=enum.SUCCESS)