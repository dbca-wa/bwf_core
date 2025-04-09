var workflow_variables = {
  workflow_id: null,
  version_id: null,
  is_edition: true,
  add_variable_btn: null,
  containerId: null,
  container: null,

  selectedVariable: null,
  progressBar: null,
  progressContainer: null,
  variablesController: null,
  variablesController: null,
  componentsController: null,
  var: {
    base_url: "/bwf/api/workflow-variables/",
    variables: [],
  },

  init: function (options, containerId) {
    const eventVariablesChange = new Event(EVENT_VARIABLES_CHANGE);
    const { workflow_id, version_id, is_edition } = options;
    const _ = workflow_variables;
    if (!workflow_id || !version_id || !containerId) {
      console.error("workflow_id and containerId are required");
      console.error("workflow_id is required");
      return;
    }
    _.is_edition = is_edition;
    _.workflow_id = workflow_id;
    _.version_id = version_id;
    _.containerId = containerId;
    _.container = $(`#${containerId} #variables`);
    _.add_variable_btn = $(`#${containerId} button.add-variable`);
    // Add + Buttton
    const _params = {
      workflow_id: _.workflow_id,
      version_id: _.version_id,
    };
    const queryParams = utils.make_query_params(_params);
    $.ajax({
      url: _.var.base_url + "?" + queryParams,
      type: "GET",
      success: function (data) {
        _.var.variables = data;
        _.renderVariables();
        document.dispatchEvent(eventVariablesChange);
      },
      error: function (error) {
        console.error(error);
      },
    });
    if (_.is_edition) {
      _.add_variable_btn.on("click", function () {
        const _ = workflow_variables;
        _.selectedVariable = null;
        $("#variables-modal").modal("show");
      });
    } else {
      _.add_variable_btn.remove();
    }
  },
  renderVariables: function () {
    const _ = workflow_variables;
    const variables = _.var.variables;
    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];
      _.appendVariable(variable);
    }
  },
  appendVariable: function (variable) {
    const _ = workflow_variables;
    const elementId = `variable_${variable.id}`;
    const variableMarkup = `
          <label id="${elementId}" class="list-group-item d-flex gap-2">
            <div class="d-flex gap-2 justify-content-between w-100">
            <div>
              <span class='var-name'>
                ${variable.name}
              </span>
              <small class="d-block text-body-secondary var-type">${variable.data_type}</small>
            </div>
            <div class="form-check form-switch">
              <button class="btn btn-ghost edit-variable" data-variable-id="${variable.id}">
                <i class="bi bi-gear"></i>
              </button>
              <button class="btn btn-ghost remove-variable" data-variable-id="${variable.id}">
                <i class="bi bi-trash text-danger"></i>
              </button>
            </div>
            </div>
          </label>
        `;
    _.container.append(variableMarkup);
    if (_.is_edition) {
      $(`#${elementId} button.edit-variable`).on("click", function (event) {
        const variableId = $(event.currentTarget).data("variable-id");
        const _ = workflow_variables;
        const variable = _.var.variables.find((v) => v.id == variableId);
        _.selectedVariable = variable;
        $("#variables-modal").modal("show");
      });
      $(`#${elementId} button.remove-variable`).on("click", function () {
        const _ = workflow_variables;
        _.selectedVariable = variable;
        console.log("remove", variable);
      });
    } else {
      $(`#${elementId} button.edit-variable`).remove();
      $(`#${elementId} button.remove-variable`).remove();
    }
  },
  api: {
    addVariable: function (variable, success_callback, error_callback) {
      const _ = workflow_variables;
      $.ajax({
        url: _.var.base_url,
        type: "POST",
        headers: { "X-CSRFToken": $("#csrf_token").val() },
        contentType: "application/json",
        data: JSON.stringify({
          ...variable,
          workflow_id: _.workflow_id,
          version_id: _.version_id,
        }),
        success: (data) => {
          workflow_variables.var.variables.push(data);
          workflow_variables.appendVariable(data);
          const eventVariablesChange = new Event(EVENT_VARIABLES_CHANGE);
          document.dispatchEvent(eventVariablesChange);
          $(".variables-select").trigger(EVENT_VARIABLES_CHANGE);
          success_callback(data);
        },
        error: error_callback,
      });
    },
    updateVariable: function (variable, success_callback, error_callback) {
      const _ = workflow_variables;
      $.ajax({
        url: _.var.base_url + variable.id + "/",
        type: "PUT",
        headers: { "X-CSRFToken": $("#csrf_token").val() },
        contentType: "application/json",
        data: JSON.stringify({
          ...variable,
          workflow_id: _.workflow_id,
          version_id: _.version_id,
        }),
        success: function(response) {
          $(`#variable_${response.id}`).find(".var-name").text(response.name);
          $(`#variable_${response.id}`).find(".var-type").text(response.data_type);
          success_callback(response);
        },
        error: function(error) {
          error_callback(error);
        },
      });
    },
    deleteVariable: function (variable, success_callback, error_callback) {
      const _ = workflow_variables;

      const _params = {
        workflow_id: _.workflow_id,
        version_id: _.version_id,
      };
      const queryParams = utils.make_query_params(_params);
      $.ajax({
        url: _.var.base_url + variable.id + "/" + "?" + queryParams,
        type: "DELETE",
        headers: { "X-CSRFToken": $("#csrf_token").val() },
        contentType: "application/json",
        success: (data) => {
          const index = workflow_variables.var.variables.findIndex(
            (a) => a.id === data.id
          );
          workflow_variables.var.variables[index] = data;
          workflow_variables.updateVariable(data);
          document.dispatchEvent(new Event(EVENT_VARIABLES_CHANGE));
          // Update GUI
          $(`#variable_${data.id}`).remove();
          success_callback(data);
        },
        error: error_callback,
      });
    },
  },
};
