
class Watcher{
    constructor(vm, expression, cb){
        this.cb = cb;
        this.vm = vm;
        this.expression = expression;
        this.value = this.get();  
    }
    update(){
        this.run();
    }
    run(){
        const value = this.get()
        var oldVal = this.value;
        this.value = value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.vm, value, oldVal);
        }
    }
    get(){
        pushTarget(this)
        var value = this.vm.data[this.expression] 
        popTarget()
        return value;
    }
    addDep (dep) {
        dep.addSub(this)
    }
}