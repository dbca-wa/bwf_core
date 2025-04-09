var bwf_workflow = {
    progressBar: null,
    progressContainer: null,
    inputsController: null,
    variablesController: null,
    componentsController: null,
    var: {
      workflow: null,
      base_url: "/bwf/api/workflow-setup/",
      base_versions_url: "/bwf/api/workflow-version/",
      components: [],
      variables: [],
      inputs: [],
    },
  
    init: function () {
      const _ = sam_dashboard;
      const params = new URL(document.location.toString()).searchParams;
  
      _.var.hasInit = false;
      _.var.page = Number(params.get("page")) || 1;
      _.var.page_size = Number(params.get("page_size")) || 10;
    //   _.enableSyncButton();
    //   _.renderDataTable();
    },
    navigate: {
      toVersionEdition: function (workflow_id, version_id) {
        window.location = `/bwf/workflow/${workflow_id}/edit/${version_id}`;
      }
    },
    api: {
      createWorkflow: function (data) {
        const _ = bwf_workflow;
        
        return new Promise((resolve, reject) => {
          $.ajax({
            url: _.var.base_url,
            type: "POST",
            headers: { "X-CSRFToken": $("#csrf_token").val() },
            contentType: "application/json",
            data: JSON.stringify({ ...data }),
            success: function (response) {
              resolve(response);
            },
            error: function (error) {
              alert("Error creating workflow");
              reject(error);
            },
          });
        });

      },
      createWorkflowVersion: function (data) {
        const _ = bwf_workflow;
        
        return new Promise((resolve, reject) => {
          $.ajax({
            url: _.var.base_versions_url,
            type: "POST",
            headers: { "X-CSRFToken": $("#csrf_token").val() },
            contentType: "application/json",
            data: JSON.stringify({ ...data }),
            success: function (response) {
              resolve(response);
            },
            error: function (error) {
              alert("Error creating workflow version");
              reject(error);
            },
          });
        });
      },
      markVersionAsCurrent: function (version_id, workflow_id) {
        const _ = bwf_workflow;
        
        return new Promise((resolve, reject) => {
          $.ajax({
            url: `${_.var.base_versions_url}${version_id}/mark_workflow_active_version/?workflow_id=${workflow_id}`,
            type: "POST",
            headers: { "X-CSRFToken": $("#csrf_token").val() },
            success: function (response) {
              resolve(response);
            },
            error: function (error) {
              alert("Error marking version as current");
              reject(error);
            },
          });
        });
      },
    }

  };
  