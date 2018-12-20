class Vue {
    constructor(data) {
        this.data = data;
        observe(data);
    }
    bindData(elm,name){
        var self = this;
        if(elm.tagName=='INPUT'){
            elm.addEventListener('input', function(e) {
                var newValue = e.target.value;
                var val = self.data[name]
                if (val === newValue) {
                    return;
                }
                self.data[name] = newValue;
            });
        }else{
            elm.innerHTML = this.data[name]
        }
        new Watcher(this, name, function (val) {
            elm.innerHTML = val;
        });

    }
}