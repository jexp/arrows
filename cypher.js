function cypher(model) {
    function props(element) {
        var props = {};
        if (element.label()) props.label = element.label();
        element.properties().list().forEach(function (property) {
            props[property.key] = property.value;
        });
        return props;
    }

    function isIdentifier(name) {
        return /^[\w\d_]+$/.test(name);
    }

    function formatIdentifier(name) {
        return isIdentifier(name) ? name : "`" + name + "`";
    }

    function render(props) {
        var res = "";
        for (var key in props) {
            if (res.length > 0) res += ",";
            if (props.hasOwnProperty(key)) {
                res += formatIdentifier(key) + ":";
                var value = props[key];
                res += typeof value == "string" ? "'" + value + "'" : value;
            }
        }
        return res.length == 0 ? "" : "{" + res + "}";
    }

    var statements = [];
    model.nodeList().forEach(function (node) {
        statements.push("(" + formatIdentifier("_"+node.id) +" "+ render(props(node)) + ")");
    });
    model.relationshipList().forEach(function (rel) {
        statements.push(formatIdentifier("_"+rel.start.id) +
            "-[:" + formatIdentifier(rel.label()||"RELATED_TO") +
            // " " + TODO render(props(rel)) +
            "]->"+
            formatIdentifier("_"+rel.end.id)
        )
    });
    if (statements.length==0) return "";
    return "CREATE \n  " + statements.join(",\n  ");
};
if (typeof exports != "undefined") exports.cypher=cypher
gd.cypher=function(model) {return cypher(model || this.model());}