class Vue {
    constructor(data) {
        this.data = data;
        observe(data);
    }
    bindData(elm,name){
        elm.innerHTML = this.data[name]
        new Watcher(this, name, function (val) {
            elm.innerHTML = val;
        });

    }
}