var vows = require("vows"),
    assert = require("assert" ),
    d3 = require("d3");

var suite = vows.describe("graph model");

require("../../graph-diagram.js");
var cypher=require("../../cypher.js").cypher;

suite.addBatch({
    "format cypher": {
        "empty model": {
            topic: function() {
                var model = gd.model();
                return cypher(model);
            },
            "empty": function(statement) {
                assert.equal(statement, "");
            }
        },
        "one node": {
            topic: function() {
                var model = gd.model();
                model.createNode("node_A").x(12).y(34).label("A" ).class("diagram-specific-class")
                    .properties().set("first name", "Alistair").set("location", "London").set("number",1).set("male",true);

                return cypher(model);
            },
            "one node": function(statement) {
                assert.match(statement,/CREATE/);
            },
            "with node id": function(statement) {
                assert.match(statement,/\(_node_A /);
            },
            "with label": function(statement) {
                assert.match(statement,/label:'A'/);
            },
            "with properties": function(statement) {
                assert.match(statement,/`first name`:'Alistair'/);
                assert.match(statement,/location:'London'/);
                assert.match(statement,/number:1/);
                assert.match(statement,/male:true/);
            }
        },
        "two nodes and one relationship": {
            topic: function() {
                var model = gd.model();
                var nodeA = model.createNode("node_A");
                var nodeB = model.createNode("node B");
                model.createRelationship(nodeA, nodeB).label("RELATED TO" ).class("diagram-specific-class");
                return cypher(model);
            },
            "create statement": function(statement) {
                assert.match(statement,/CREATE/);
            },
            "from A": function(statement) {
                assert.match(statement,/\(_node_A \)/);
                assert.match(statement,/_node_A-\[/);
            },
            "to B": function(statement) {
                assert.match(statement,/\(`_node B` \)/);
                assert.match(statement,/\]->`_node B`/);
            },
            "with label": function(statement) {
                assert.match(statement,/\[:`RELATED TO`/);
            }
        }
    }
});

suite.export(module);