var component_definitions = {
    workflow_id: null,
    containerId: null,
    container: null,
    progressBar: null,
    progressContainer: null,
    inputsController: null,
    variablesController: null,
    componentsController: null,
    var: {
      base_url: "/bwf/api/component-definitions/",
    },
  
    init: function (containerId) {

      const _params = {
        search: search
      };
      const queryParams = utils.make_query_params(_params);
  
      $.ajax({
        url: _.var.base_url + "?" + queryParams,
        type: "GET",
        success: function (data) {
          _.var.inputs = data.inputs;
          _.renderInputs();
        },
        error: function (error) {
          console.error(error);
        },
      });
    },
    renderInputs: function () {

    },
    onOpenInput: function (input) {
      console.log(input);
    },
    onCloseInput: function (input) {
      console.log(input);
    },
    

  };
  