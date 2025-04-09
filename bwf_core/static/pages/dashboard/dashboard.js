var bwf_dashboard = {
    dt: null,
    progressBar: null,
    progressContainer: null,
    var: {
      hasInit: false,
      page: 1,
      page_size: 10,
      search: "",
      url: "/api/list_historical_records/",
      data: [],
      breadcrumb: [],
      root: "",
      location: "",
      isDownloading: false,
    },
  
    init: function () {
      const _ = sam_dashboard;
      const params = new URL(document.location.toString()).searchParams;
  
      _.var.hasInit = false;
      _.var.page = Number(params.get("page")) || 1;
      _.var.page_size = Number(params.get("page_size")) || 10;
  
      _.var.search = params.get("search") ?? "";
  
      _.var.location = window.location.href.split("?")[0];
    //   _.enableSyncButton();
    //   _.renderDataTable();
    },

  };
  