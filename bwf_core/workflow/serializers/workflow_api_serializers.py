from django.utils.translation import gettext_lazy as _

from rest_framework import serializers
from bwf_core.models import WorkflowVersion, WorkFlowInstance, ComponentInstance

class CreateWorkflowInstanceSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(max_length=1000, required=False, default="", allow_blank=True)
    workflow_id = serializers.IntegerField()
    input = serializers.JSONField(required=False)
    

class WorkflowVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowVersion
        exclude = ['workflow']


class WorkflowComponentInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComponentInstance
        exclude = ['options', 'output', 'input', 'workflow']


class WorkflowInstanceSerializer(serializers.ModelSerializer):
    workflow_version = WorkflowVersionSerializer()
    class Meta:
        model = WorkFlowInstance
        exclude = ['variables']
