class Dep {
    constructor(){
        this.subs = []
    }
    addSub (sub){
        this.subs.push(sub);
    }
    notify() {
        this.subs.forEach(sub => sub.update());
    }
    depend () {
        if (Dep.target) {
            Dep.target.addDep(this)
        }
    }
};

Dep.target = null
const targetStack = []

function pushTarget (_target) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

function popTarget () {
  Dep.target = targetStack.pop()
}
