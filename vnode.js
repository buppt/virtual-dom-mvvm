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
        return element;
    }
}