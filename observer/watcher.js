let watcherId = 0;
class Watcher{
    constructor(vm, expression, cb){
        this.id = ++watcherId;
        this.cb = cb;
        this.vm = vm;
        this.expression = expression;
        this.deps = []
        this.newDeps = []
        this.depIds = new Set()
        this.newDepIds = new Set()
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
        var value = this.vm.data[this.expression]  // 强制执行监听器里的get函数
        popTarget()
        this.cleanupDeps()
        return value;
    }
    addDep (dep) {
        const id = dep.id
        if (!this.newDepIds.has(id)) {
          this.newDepIds.add(id)
          this.newDeps.push(dep)
          if (!this.depIds.has(id)) {
            dep.addSub(this)
          }
        }
      }
    cleanupDeps () {
        for (let depId in this.depIds) {
            if (!this.newDepIds[depId]) {
              DepCollector.map[depId].remove(this);
            }
          }
        let i = this.deps.length
        while (i--) {
          const dep = this.deps[i]
          if (!this.newDepIds.has(dep.id)) {
            dep.removeSub(this)
          }
        }
        let tmp = this.depIds
        this.depIds = this.newDepIds
        this.newDepIds = tmp
        this.newDepIds.clear()
        tmp = this.deps
        this.deps = this.newDeps
        this.newDeps = tmp
        this.newDeps.length = 0
      }
    depend () {
        let i = this.deps.length
        while (i--) {
          this.deps[i].depend()
        }
      }
}