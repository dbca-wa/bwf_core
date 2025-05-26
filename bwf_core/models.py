import uuid
import json
import collections.abc

from django.db import models
from django.conf import settings
from django.core.files.storage import FileSystemStorage

from bwf_core import exceptions as bwf_exceptions

from bwf_core.workflow.dto.component_dto import ComponentDto

upload_storage = FileSystemStorage(location=settings.PRIVATE_MEDIA_ROOT)

class WorkflowTypesEnum(models.TextChoices):
    LONG_LIVED = "LONG_LIVED", "Long Lived"
    SHORT_LIVED = "SHORT_LIVED", "Short Lived"

class FailureHandleTypesEnum(models.TextChoices):
    RETRY = "RETRY", "Retry"
    IGNORE = "IGNORE", "Ignore"
    TERMINATE = "TERMINATE", "Terminate"
    CUSTOM = "CUSTOM", "Custom"

class WorkflowStatusEnum(models.TextChoices):
    PENDING = "PENDING", "initial"
    RUNNING = "RUNNING", "running"
    COMPLETED = "COMPLETED", "completed"
    AWAITING_ACTION = "AWAITING_ACTION", "awaiting_action"
    ERROR = "ERROR",  "error"
    TERMINATED = "TERMINATED", "terminated"


class ComponentStepStatusEnum(models.TextChoices):
    PENDING = "PENDING", "initial"
    RUNNING = "RUNNING", "running"
    COMPLETED = "COMPLETED", "completed"
    ERROR = "ERROR", "error"

class WorkflowInputTypesEnum(models.TextChoices):
    STRING = "string", "string"
    NUMBER = "number", "number"
    ARRAY = "array", "array"
    OBJECT = "object", "object"
    BOOLEAN = "boolean", "boolean"
    SELECT = "select", "select"
    MULTI_SELECT = "multi_select", "multi_select"
    FILE = "file", "file"
    ANY = "any", "any"

class VariableTypesEnum(models.TextChoices):
    STRING = "string", "string"
    NUMBER = "number", "number"
    ARRAY = "array", "array"
    OBJECT = "object", "object"
    BOOLEAN = "boolean", "boolean"

class ContextTypesEnum(models.TextChoices):
    GLOBAL = "GLOBAL", "Global"
    LOCAL = "LOCAL", "Local"
    INPUT = "INPUT", "Input"
    SECRET = "SECRET", "Secret"


class JobQueueStatusEnum(models.TextChoices):
    QUEUED = "QUEUED", "QUEUED"
    RUNNING = "RUNNING", "RUNNING"
    CANCELLED = "CANCELLED", "CANCELLED"
    COMPLETED = "COMPLETED", "COMPLETED"
    ERROR = "ERROR", "ERROR"


def get_unique_id():
    return str(uuid.uuid4())

def upload_to_path(instance, filename):
    return f"bwf/workflows/{instance.id}/{instance.version_number}/{filename}"

def updaload_to_workflow_edition_path(instance, filename):
    return f"bwf/workflows/{instance.workflow.id}/edition/{instance.id}/{filename}"


class Workflow(models.Model):
    name = models.CharField(max_length=200)
    workflow_type = models.CharField(max_length=50, choices=WorkflowTypesEnum.choices, default=WorkflowTypesEnum.SHORT_LIVED)
    description = models.CharField(max_length=1000, null=True, blank=True)
    version_number = models.IntegerField(default=1)
    workflow_file = models.FileField(max_length=1000, upload_to=upload_to_path, null=True, blank=True, storage=upload_storage)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def set_json_definition(self, definition):
        with open(self.workflow_file.path, 'w') as json_file:
            json.dump(definition, json_file)
        self.save()

    def get_json_definition(self):
        workflow_json = {}
        if self.workflow_file:
            with open(self.workflow_file.path) as json_file:
                workflow_json = json.load(json_file)
        return workflow_json

    def get_workflow_definition(self):
        definition = self.get_json_definition()
        return definition.get('workflow', {})
    
    def get_active_version(self):
        return self.versions.filter(is_active=True).first()

    def __str__(self):
        return f"{self.name} - {self.version_number}"


class WorkflowVersion(models.Model):
    workflow = models.ForeignKey(to=Workflow, on_delete=models.CASCADE, related_name="versions")
    version_number = models.IntegerField(max_length=15)
    version_name = models.CharField(max_length=50)
    applied_on = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edition = models.BooleanField(default=True)
    is_disabled = models.BooleanField(default=False)
    disabled_at = models.DateTimeField(null=True, blank=True)
    parent_version = models.ForeignKey(to="WorkflowVersion", on_delete=models.CASCADE, related_name="child_versions", null=True, blank=True)

    workflow_file = models.FileField(max_length=1000, upload_to=updaload_to_workflow_edition_path, null=True, blank=True, storage=upload_storage)

    @property
    def is_editable(self):
        return self.is_edition and not self.is_active  and not self.is_disabled

    def set_as_active_version(self):
        self.workflow.versions.filter(is_active=True).update(is_active=False)
        self.is_active = True
        self.is_edition = False
        self.applied_on = self.updated_at
        self.save()
        self.workflow.version_number = self.version_number
        self.workflow.save()

    def set_json_definition(self, definition):
        with open(self.workflow_file.path, 'w') as json_file:
            json.dump(definition, json_file)
        self.save()

    def get_json_definition(self):
        workflow_json = {}
        if self.workflow_file:
            with open(self.workflow_file.path) as json_file:
                workflow_json = json.load(json_file)
        return workflow_json

    def get_workflow_definition(self):
        definition = self.get_json_definition()
        return definition.get('workflow', {})

    def __str__(self):
        return f"{self.workflow} | {str(self.version_number)} | {self.version_name}"

class WorkFlowInstance(models.Model):
    workflow_version = models.ForeignKey(to=WorkflowVersion, on_delete=models.CASCADE, related_name="instances", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    variables = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=ComponentStepStatusEnum.choices, default=ComponentStepStatusEnum.PENDING)
    error_message = models.CharField(max_length=1000, null=True, blank=True)

    def __str__(self):
        return f"{self.pk} - {self.workflow_version} - {self.id}"

    def get_json_definition(self):
        return self.workflow_version.get_json_definition()

    # Current task
    # start task
    def set_status_completed(self):
        from bwf_core.workflow.action_log import tasks as action_log_tasks
        self.status = WorkflowStatusEnum.COMPLETED
        self.save()
        action_log_tasks.record_workflow_success(self)

    
    def set_status_error(self, message=""):
        from bwf_core.workflow.action_log import tasks as action_log_tasks
        self.status = WorkflowStatusEnum.ERROR
        self.error_message = message[:1000]
        self.save()
        action_log_tasks.record_workflow_error(self, self.error_message)
    
    def set_status_terminated(self):
        from bwf_core.workflow.action_log import tasks as action_log_tasks
        self.status = WorkflowStatusEnum.TERMINATED
        self.save()
        action_log_tasks.record_workflow_terminated(self)


class ComponentInstance(models.Model):
    component_id = models.CharField(max_length=100)
    workflow = models.ForeignKey(WorkFlowInstance, on_delete=models.CASCADE, related_name="child_actions")
    parent_node = models.ForeignKey(to="ComponentInstance", on_delete=models.CASCADE, related_name="children_nodes", null=True, blank=True)
    component_definition = models.JSONField(null=True, blank=True)
    plugin_id = models.CharField(max_length=500, null=True, blank=True)
    plugin_version = models.CharField(max_length=15, null=True, blank=True)

    options = models.JSONField(null=True, blank=True) 

    output = models.JSONField(null=True, blank=True)
    input = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50, choices=WorkflowStatusEnum.choices, default=WorkflowStatusEnum.PENDING)
    error_message = models.CharField(max_length=1000, null=True, blank=True)
    
    def __str__(self):
        return f"ID: {self.component_id}, Plugin: {self.plugin_id} V:{self.plugin_version} "

    def set_status_completed(self):
        from bwf_core.workflow.action_log import tasks as action_log_tasks
        self.status = WorkflowStatusEnum.COMPLETED
        self.save()
        action_log_tasks.record_component_success(self)

    def set_status_running(self):
        from bwf_core.workflow.action_log import tasks as action_log_tasks
        self.status = WorkflowStatusEnum.RUNNING
        self.save()
        action_log_tasks.record_component_started(self)

    
    def set_status_awaiting_action(self):
        from bwf_core.workflow.action_log import tasks as action_log_tasks
        self.status = WorkflowStatusEnum.AWAITING_ACTION
        self.save()
        action_log_tasks.record_component_pending(self)
    
    def set_status_error(self, message=""):
        from bwf_core.workflow.action_log import tasks as action_log_tasks
        self.status = WorkflowStatusEnum.ERROR
        self.error_message = message[:1000]
        self.save()
        action_log_tasks.record_component_error(self, self.error_message)

    def get_input_values(self, inputs=[], context_values={}):
        values = {} 
        for input in inputs:
            values[input.key] = {"key": input.get("key"), "value": input.get_value(context_values), "label": input.get("name")}
        return values
    
    def get_node_context(self):
        context = {}
        if self.parent_node:
            context.update({"parent": self.parent_node.get_node_context()})
        if self.options:
            context.update(self.options.get("context", {}))
        return context

    


class WorkflowInstanceFactory:

    @staticmethod
    def create_instance(workflow_version: WorkflowVersion, input_params={}):
        # TODO: Check if workflow is active and version is correct
        instance = WorkFlowInstance(workflow_version=workflow_version)
        workflow_definition = workflow_version.get_json_definition()

        # collect variables
        input_values = workflow_definition.get("inputs", {})
        local_variables = workflow_definition.get("variables", {})
        context = {
            'inputs': {},
            'variables': {},
            'local': {},
        }

        for key  in local_variables:
            variable = local_variables[key]
            context[variable['context']][key] = variable.get("value", None)
            context[variable['context']][variable['name']] = variable.get("value", None)

        for key in input_values:
            input = input_values[key]
            input_value = WorkflowInstanceFactory.__get_input_value(input, input_params.get(input["key"]))
            context['inputs'][input["id"]] = input_value
            context['inputs'][input["key"]] = input_value
        instance.variables = context
        
        instance.save()
        return instance

    @staticmethod
    def __get_input_value(input_value, param_value=None):
        input_type = input_value.get("data_type", None)
        json_default = input_value.get("default_value", None) # TODO: get default type for data type
        json_value = input_value.get("value", {})

        if param_value is None and input_value['required'] == True and (json_default is None or json_default['value'] is None):
            raise ValueError(f"Required input {input_value.key} is missing")
        if param_value is None:
            return json_default['value']
        else:
            if input_type in [WorkflowInputTypesEnum.SELECT, WorkflowInputTypesEnum.MULTI_SELECT]:
                values = []
                param_value = param_value if isinstance(param_value, collections.abc.Sequence) else [param_value]
                options = json_value.get("value", {})['options']
                for option in options:
                    if option['key'] in param_value:
                        values.append(option['key'])
                
                return values
            else:
                if input_type == WorkflowInputTypesEnum.NUMBER:
                    return int(param_value)
                elif input_type == WorkflowInputTypesEnum.BOOLEAN:
                    return bool(param_value)
                else:
                    return param_value

'''  =======================  '''


class WorkflowComponentInstanceFactory:


    @staticmethod
    def create_component_instance(workflow_instance: WorkFlowInstance, component, parent_node_instance=None, input_params={}):
        if parent_node_instance:
            input_params.update({ "local": parent_node_instance.get_node_context() })

        component_dto = ComponentDto(workflow_context=input_params,
                                     id=component['id'], 
                                     name=component['name'],
                                     plugin_id=component['plugin_id'],
                                     version_number=component['version_number'],
                                     config=component['config'],
                                     conditions=component['conditions'])

        input_values = {}
        instance = ComponentInstance.objects.create(workflow=workflow_instance, component_id=component['id'], 
                                                    plugin_id=component_dto.plugin_id, 
                                                    plugin_version=component_dto.version_number, 
                                                    parent_node=parent_node_instance,
                                                    input=input_values,
                                                    options={})

        input_values = component_dto.get_inputs()
        instance.input = input_values
        instance.save()
        return instance

    @staticmethod
    def __get_input_value(input_value, param_value=None):
        input_type = input_value.data_type
        json_default = json.load(input_value.default_value)
        json_value = json.load(input_value.default_value)

        if param_value is None:
            return json_default['value']
        else:
            if input_type in [WorkflowInputTypesEnum.SELECT, WorkflowInputTypesEnum.MULTI_SELECT]:
                values = []
                param_value = param_value if isinstance(param_value, collections.abc.Sequence) else [param_value]
                options = json_value.value['options']
                for option in options:
                    if option['key'] in param_value:
                        values.append(option['key'])
                
                return values
            else:
                if input_type == WorkflowInputTypesEnum.NUMBER:
                    return int(param_value)
                elif input_type == WorkflowInputTypesEnum.BOOLEAN:
                    return bool(param_value)
                else:
                    return param_value



class ActionLogStatusEnum(models.TextChoices):
    SUCCESS = "SUCCESS", "success"
    ERROR = "ERROR", "error"
    PENDING = "PENDING", "pending"
    STARTED = "STARTED", "started"
    STOPPED = "STOPPED", "stopped"
    RESTARTED = "RESTARTED", "restarted"
    TERMINATED = "TERMINATED", "terminated"
    

class ActionLog(models.Model):
    workflow_instance = models.ForeignKey(to=WorkFlowInstance, on_delete=models.SET_NULL, related_name="action_logs", null=True, blank=True)
    component_instance = models.ForeignKey(to=ComponentInstance, on_delete=models.SET_NULL, related_name="action_logs", null=True, blank=True)
    status = models.CharField(max_length=100, choices=ActionLogStatusEnum.choices, default=ActionLogStatusEnum.STARTED)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def job_id(self):
        return self.component_instance.id