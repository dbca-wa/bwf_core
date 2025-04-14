from django.contrib import admin
from bwf_core.models import Workflow, WorkflowVersion, WorkFlowInstance, ComponentInstance, ActionLog


# inline workflowversion
class WorkflowVersionInline(admin.TabularInline):
    model = WorkflowVersion
    extra = 0
    fields = ('version_name', 'version_number', 'is_edition', 'is_active', 'workflow_file', 'created_at', 'updated_at')
    ordering = ('-id',)
    readonly_fields = ('created_at','updated_at',)
    show_change_link = True

@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'description',
        'workflow_file',
        'created_at',
    ]
    inlines = [WorkflowVersionInline]

@admin.register(WorkflowVersion)
class WorkflowVersionAdmin(admin.ModelAdmin):
    list_display = [
        'workflow',
        'is_edition',
        'is_active',
        'workflow_file',
        'version_name',
        'version_number',
        'created_at',
    ]
    list_filter = ["is_active"]

class ComponentInstanceInline(admin.TabularInline):
    model = ComponentInstance
    extra = 0
    fields = ('component_id','created_at', 'updated_at', 'input', 'status',)
    ordering = ('-id',)
    readonly_fields = ('component_id', 'created_at','updated_at',)

class ActionLogInline(admin.TabularInline):
    model = ActionLog
    extra = 0
    fields = ('component_instance', 'status', 'error_message', 'created_at', 'updated_at')
    ordering = ('-id',)
    raw_id_fields = ('component_instance',)
    readonly_fields = ('component_instance', 'created_at','updated_at',)

@admin.register(WorkFlowInstance)
class WorkFlowInstanceAdmin(admin.ModelAdmin):
    list_display = [
        '__str__',
        'status',
        'created_at',
    ]
    raw_id_fields = ('workflow_version',)
    list_filter = ["status"]
    inlines = [ComponentInstanceInline, ActionLogInline]