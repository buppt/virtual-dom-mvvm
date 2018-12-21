# virtual-dom
用 vue@2.5.17 中的思路实现的 virtual dom.  


## 双向绑定实现讲解
其实写双向绑定的文章也挺多了，不过都没有仔细讲发布者-订阅者模式在其中的使用，本文尽量讲解清楚所有代码，代码结构、函数等完全按照vue@2.5.17源码思路实现（除了新建vue类的时候）。<a href='https://github.com/buppt/virtual-dom-mvvm'>github地址在这里</a>。

![在这里插入图片描述](https://img-blog.csdnimg.cn/20181221172933219.gif)
图中，input的value、h1、h2都与`data.name`绑定，可以通过input改变`data.name`，`data.name`改变后（发布者）与之绑定的h1、h2（两个订阅者）都会改变，即实现了双向绑定。

本文目的是学习双向绑定，没有实现模版解析，所以并不能像vue一样通过`{{name}}`就将这个位置的内容与`data.name`绑定，需要手动将element和data绑定。不过这不重要。

```html
<h1 id="name"></h1>
<p id="num"></p>
<h2 id="name2"></h2>
<input id="input" type="text"/>
<script>
var name1 = document.getElementById('name');
var num = document.getElementById('num');
var name2 = document.getElementById('name2');
var input = document.getElementById('input');

var selfVue = new Vue({
    name: 'hello world',
    a:1,
});

selfVue.bindData(name1,'name')
selfVue.bindData(num,'a')
selfVue.bindData(name2,'name')
selfVue.bindData(input,'name')
</script>
```
新建的Vue类如下
```javascript
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
```
new一个vue之后，会将data中的数据进行observe，data中每一个数据都是一个发布者，每有一个元素与数据绑定，就会新建一个watcher（订阅者），观察着数据是否会发生变化，然后执行变化后的操作。

observer的代码如下:
```javascript
class Observer{
    constructor(data) {
        this.data = data;
        this.walk(data);
    }
    walk(data) {
        Object.keys(data).forEach(function(key) {
            defineReactive(data, key, data[key]);
        });
    }
    
}

function observe(value) {
    if (!value || typeof value !== 'object') {
        return;
    }
    return new Observer(value);
}

function defineReactive(data, key, val) {
    const dep = new Dep();
    let childOb = observe(val);
    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get: function() {
            if (Dep.target) {
                dep.depend();
                if (childOb) {
                    childOb.dep.depend()
                }
            }
            return val;
        },
        set: function(newVal) {
            if (newVal === val) {
                return;
            }
            val = newVal;
            dep.notify();
        }
    });
}
```
data中的每一个数据会new一个Dep发布者，当读取该数据时(get)，会执行`dep.depend()`，修改其中的数据时(set)，会执行`dep.notify()`

dep.js代码如下
```javascript
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
```
Dep中，subs用来存储订阅这个发布者的所有订阅者。
前面说过，当读取该数据时(get)，会执行`dep.depend()`，现在可以知道，depend函数执行的是watcher的`addDep`函数。
修改其中的数据时(set)，会执行`dep.notify()`，现在知道notify函数执行的是watcher的`update`函数。

然后是watcher的代码。
```javascript

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
```
前面知道每有一个元素与数据绑定，就会新建一个watcher（订阅者）。
watcher构造函数中执行了`this.get()`，该函数中用到了`pushTarget(this)`和`popTarget()`，代码如下
```javascript
function pushTarget (_target) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}
function popTarget () {
  Dep.target = targetStack.pop()
}
```
pushTarget(this)先把Dep.target设置为自己，然后获取data中数据的时候就可以触发之前设置的，`if (Dep.target)  dep.depend();` 然后就触发了自己watcher中的`addDep (dep) `，如果这个watcher没有订阅该发布者dep的话，就触发` dep.addSub(this)`，将这个watcher加入到发布者dep的订阅者subs中。
然后把之前pushTarget(this)的Dep.targets删掉。

这样，当data中的数据发生变化之后，就会执行set中的`dep.notify();`，然后就会执行该发布者的所有订阅者的update函数`this.subs.forEach(sub => sub.update());`

即每一个订阅者根据需要改变自己的dom或textContent。（这里就是虚拟dom的工作了，下一篇文章会介绍虚拟dom的源码和实现）。

<a href='https://github.com/buppt/virtual-dom-mvvm'>欢迎star~</a>

