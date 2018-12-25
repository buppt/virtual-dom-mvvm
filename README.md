# virtual-dom
用 vue@2.5.17 中的思路实现的 virtual dom.  


<a href='https://buppt.github.io/virtual-dom-mvvm/data-binding.html'>双向绑定在线查看</a>
<a href='https://buppt.github.io/virtual-dom-mvvm/vdom-example.html'>虚拟dom在线查看</a>
<a href='https://buppt.github.io/virtual-dom-mvvm/vue-router/hash-router-example.html'>hash router在线查看</a>
<a href='https://buppt.github.io/virtual-dom-mvvm/vue-router/history-example/history-router-example.html'>history router在线查看</a>

![在这里插入图片描述](https://img-blog.csdnimg.cn/20181221172933219.gif)
<br/>
<a href='https://github.com/buppt/virtual-dom-mvvm#双向绑定实现讲解'>双向绑定实现讲解</a>

<br/>

![在这里插入图片描述](https://img-blog.csdnimg.cn/20181221223702723.gif)

<br/>
<a href='https://github.com/buppt/virtual-dom-mvvm#虚拟dom实现讲解'>虚拟dom实现讲解</a>

## 双向绑定实现讲解
其实写双向绑定的文章也挺多了，不过都没有仔细讲发布者-订阅者模式在其中的使用，本文尽量讲解清楚所有代码，代码结构、函数等完全按照vue@2.5.17源码思路实现（除了新建vue类的时候）。<a href='https://github.com/buppt/virtual-dom-mvvm'>github地址在这里</a>。

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

## 虚拟dom实现讲解
网上实现虚拟dom的文章也很多了，本项目代码结构、函数等完全按照vue@2.5.17源码思路实现，主要也是为了总结一下自己的学习。<a href='https://github.com/buppt/virtual-dom-mvvm'>github地址在这里</a>。


从图中可以看到，这个dom树改变了许多地方，但是只新建了一个div元素，这说明其余的元素只是做了移动和文本内容的修改，这比重新渲染整棵dom树要节省很多资源。

不多解释了，下面直接看代码吧。因为vue是通过模版解析之后生成的虚拟dom，我主要为了学习虚拟dom，没有做模版解析，所以手动建立了两棵虚拟dom树（这不重要），然后通过patch函数对比，改变真实的dom树结构。
```html
<body>
    <script src="./vdom/vnode.js"></script>
    <script src="./vdom/patch.js"></script>
    <script>
    var ul = new VNode('ul',{class: 'ul'},[
        new VNode('p', {class: 'li'},[],'virtual dom'),
        new VNode('li',{class: 'li'},[],'mvvm'),
        new VNode('li', {class: 'li'},[],'virtual dom'),
        new VNode('input',{type: 'text'}),
        new VNode('li', {class: 'li'},[],'virtual dom'),
        new VNode('li',{},[],'mvvm'),
        new VNode('li',{class: 'li'},[],'buppt')
        ])
    var ul2 = new VNode('ul',{class: 'ul'},[
        new VNode('li', {class: 'li'},[],'buppt'),
        new VNode('li',{class: 'li'},[],'mvvm'),
        new VNode('p',{},[],'h1 dom'),
        new VNode('li',{class: 'li'},[],'h1 dom'),
        new VNode('div',{},[],'h1 dom'),
        new VNode('input',{type:'text'},[]),
        ])

    document.body.appendChild(ul.render())
    setTimeout(()=>{
        console.log('vnode change')
        patch(ul,ul2)
    },2000)  
    </script>
</body>
```
VNode类的代码如下，主要记录一个虚拟元素节点的标签名称、属性、子节点、文本内容、对应的真实dom中的element元素。render函数就是将这个虚拟的元素节点渲染成一个真实的dom节点的函数。
```javascript
class VNode{
    constructor(tagName,props={},children=[],text=''){
        this.tagName=tagName;
        this.props=props ;
        this.children=children;
        this.text=text
        this.key = props && props.key
        var count = 0;
        children.forEach(child => {
            if(child instanceof VNode){
                count+=child.count;
            }
            count++;
        });
        this.count = count;
    }
    render(){
        let element = document.createElement(this.tagName);
        for(let key in this.props){
            element.setAttribute(key,this.props[key])
        }
        for(let child of this.children){
            if(child instanceof VNode){
                element.appendChild(child.render())
            }
        }
        if(this.text){
            element.appendChild(document.createTextNode(this.text))
        }
        this.elm = element;
        console.log(element)
        return element;
    }
}
```
这些比较简单，主要是下面对比两棵虚拟dom树的diff算法。
```javascript
function patch (oldVnode, vnode) {
  if(isUndef(vnode)){
      return
  }
  if (oldVnode === vnode) {
      return 
  }
  if(sameVnode(oldVnode, vnode)){
        patchVnode(oldVnode, vnode)
  }else{
      const parentElm = oldVnode.elm.parentNode;
      createElm(vnode,parentElm,oldVnode.elm)
      removeVnodes(parentElm,[oldVnode],0,0)
  }
}
function sameVnode (a, b) {
  return (
      a.key === b.key && 
      a.tagName=== b.tagName &&
      sameInputType(a, b)
  )
}

function sameInputType (a, b) {
  if (a.tag !== 'input') return true
  return a.props.type == b.props.type
}
```
可以看到，如果两棵树相同，即没有发生变化，直接返回。

因为虚拟dom只是判断两棵树的同一层的树结构有没有变化，所以这里判断两个根节点是否为sameVnode，如果是，就执行更关键的patchVnode函数，如果不是，直接新建这棵新树。

```javascript
function patchVnode(oldVnode, vnode){
  var ch = vnode.children
  var oldCh = oldVnode.children
  if(isUndef(vnode.text)){
    if(isDef(ch) && isDef(oldCh)){
        updateChildren(oldVnode.elm,oldCh,ch)
    }else if(isDef(ch)){
        if (isDef(oldVnode.text)) setTextContent(oldVnode.elm, '')
        addVnodes(oldVnode, ch, 0, ch.length - 1)
    }else if(isDef(oldCh)){
        removeVnodes(oldVnode.elm, oldCh, 0, oldCh.length - 1)
    }
  }else{
      setTextContent(oldVnode.elm,vnode.text);
  }
}
```
已知patchVnode函数是两个根节点相同的树了，需要的是判断他们两个的子节点。

根据代码中的几个判断可以得知，如果元素是文本节点，直接替换其中的文本即可。
如果新树和旧树都有子节点，则执行更为关键的updateChildren函数，如果新树有子节点，老树没有，直接添加子节点，如果新树没有子节点，老树有，直接删除子节点。

```javascript
function updateChildren(parentElm, oldCh, newCh,){
  let oldStartIdx = 0
  let newStartIdx = 0
  let oldEndIdx = oldCh.length - 1
  let oldStartVnode = oldCh[0]
  let oldEndVnode = oldCh[oldEndIdx]
  let newEndIdx = newCh.length - 1
  let newStartVnode = newCh[0]
  let newEndVnode = newCh[newEndIdx]
  let oldKeyToIdx, idxInOld, vnodeToMove, refElm

  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx] 
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { 
        patchVnode(oldStartVnode, newEndVnode)
        insertBefore(parentElm, oldStartVnode.elm, oldEndVnode.elm.nextSibling)
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { 
        patchVnode(oldEndVnode, newStartVnode)
        insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
        if (isUndef(idxInOld)) {
          createElm(newStartVnode, parentElm, oldStartVnode.elm)
        } else {
          vnodeToMove = oldCh[idxInOld]
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode)
            oldCh[idxInOld] = undefined
            insertBefore(parentElm,vnodeToMove.elm, oldStartVnode.elm)
          } else {
            createElm(newStartVnode, parentElm, oldStartVnode.elm)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
    }
    
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, newCh, newStartIdx, newEndIdx)
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
}
```
updateChildren函数用到了四个指针，就是判断比较多。oldStartIdx 、oldEndIdx 分别指向老树的头和尾，newStartIdx 、newEndIdx 分别指向新树的头和尾。

如果新树的头等于老树的头，两个startId都++，如果新树的尾等于老树的尾，两个endId都--。

如果新树的头等于老树的尾，则把老树的尾移动到老树的头前，然后newStartIdx ++，oldEndIdx --。

如果新树的尾等于老树的头，则把老树的头移动到老树的尾后面，然后oldStartIdx ++，newEndIdx --。

如果上面四个判断都不成立，如果新树的头有key的话，就直接找有key的老树节点，没有key则将新树的头与现在老树头和尾直接的元素一一比较。如果有相同的，就把老树的这个节点移动到老树的头前，newStartIdx ++；如果没有相同的，就新建这个节点，插到老树的头前，newStartIdx ++。

操作真实dom的代码如下
```javascript
function setTextContent(elm, content){
  elm.textContent = content;
}
function addVnodes (parentElm, vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    createElm(vnodes[startIdx], parentElm, null)
  }
}
function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
  for (let i=startIdx; i <= endIdx; i++) {
    var ch = vnodes[i]
    if(ch){
      parentElm.removeChild(vnodes[i].elm)
    }
  }
}

function createElm (vnode, parentElm, afterElm) {
  let element = vnode.render()
  vnode.elm = element;
  if(isDef(afterElm)){
    insertBefore(parentElm,element,afterElm)
  }else{
    parentElm.appendChild(element)
  }
  return element;
}
function insertBefore(parentElm,element,afterElm){
  parentElm.insertBefore(element,afterElm)
}
```

<a href='https://github.com/buppt/virtual-dom-mvvm'>完整代码在这里，欢迎star~</a>
