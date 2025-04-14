"""
URL configuration for layerCacheService project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django import conf
from django import urls
from . import views
from .workflow import views as workflow_viewsets
from .components import views as component_viewsets
from rest_framework import routers

admin.site.site_header = conf.settings.PROJECT_TITLE
admin.site.index_title = conf.settings.PROJECT_TITLE
admin.site.site_title = conf.settings.PROJECT_TITLE

router = routers.DefaultRouter()
router.register('workflow-setup', workflow_viewsets.WorkflowViewset)
router.register('workflow-version', workflow_viewsets.WorkflowVersionViewset)
router.register('workflow-inputs', workflow_viewsets.WorkflowInputsViewset, basename="workflow-inputs")
router.register('workflow-variables', workflow_viewsets.WorkflowVariablesViewset, basename="workflow-variables")
router.register('workflow-components', component_viewsets.WorkflowComponentViewset, basename="workflow-components")

router.register('workflow-live', views.WorkflowAPIViewSet, basename="workflow-live")


urlpatterns = [
    path('bwf_admin/', admin.site.urls),
    path('dashboard', views.HomeView.as_view(), name='home'),
    path('workflow/<int:workflow_id>/', views.WorkflowView.as_view(), name='workflow'),
    path('workflow/<int:workflow_id>/edit/<int:version_id>', views.WorkflowEditionView.as_view(), name='workflow-edition'),
    path('api/plugin-definitions/', component_viewsets.PluginsCatalogueView.as_view()),
    urls.re_path(r'^workflows/(?P<id>\d+)/(?P<version>\d+)/(\w+|\-+|)+.json$', workflow_viewsets.get_workflow_file, name='get_workflow_file'),
    urls.re_path(r'^workflows/(?P<id>\d+)/edition/(?P<version>\d+)/(\w+|\-+|)+.json$', workflow_viewsets.get_workflow_file, name='get_version_file'),

    path("api/", include(router.urls)),
]
