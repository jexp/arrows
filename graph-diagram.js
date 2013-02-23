gd = {};

(function() {

    gd.parameters = {
        radius: 50,
        nodeStrokeWidth: 8,
        nodeStartMargin: 15,
        nodeEndMargin: 15,
        speechBubbleMargin: 20,
        speechBubblePadding: 10,
        speechBubbleStrokeWidth: 3
    };

    gd.model = function() {

        var nodes = {},
            relationships = [],
            highestId = 0,
            internalScale = 1,
            externalScale = 1;

        var model = {};

        var Node = function() {
            var position = {};
            var label;
            var classes = [];
            var properties = new Properties();

            this.isNew = false;

            this.class = function(classesString) {
                if (arguments.length == 1) {
                    classes = classesString.split(" ").filter(function(className) {
                        return className.length > 0 && className != "node";
                    });
                    return this;
                }
                return (this.isNew ? ["new","node"]:["node"]).concat(classes);
            };

            this.x = function(x) {
                if (arguments.length == 1) {
                    position.x = Number(x);
                    return this;
                }
                return position.x;
            };

            this.y = function(y) {
                if (arguments.length == 1) {
                    position.y = Number(y);
                    return this;
                }
                return position.y;
            };

            this.ex = function() {
                return position.x * internalScale;
            };

            this.ey = function() {
                return position.y * internalScale;
            };

            this.distanceTo = function(node) {
                var dx = node.x() - this.x();
                var dy = node.y() - this.y();
                return Math.sqrt(dx * dx + dy * dy) * internalScale;
            };

            this.drag = function(dx, dy) {
                position.x += dx / internalScale;
                position.y += dy / internalScale;
            };

            this.midwayTo = function(node) {
                var dx = node.x() - this.x();
                var dy = node.y() - this.y();
                return {
                    x: this.x() + dx / 2,
                    y: this.y() + dy / 2
                };
            };

            this.angleTo = function(node) {
                var dx = node.x() - this.x();
                var dy = node.y() - this.y();
                return Math.atan2(dy, dx) * 180 / Math.PI
            };

            this.isLeftOf = function(node) {
                return this.x() < node.x();
            };

            this.label = function(labelText) {
                if (arguments.length == 1) {
                    label = labelText;
                    return this;
                }
                return label;
            };

            this.properties = function() {
                return properties;
            };
        };

        var Properties = function() {
            var keys = [];
            var values = {};

            this.list = function() {
                return keys.map(function (key) {
                    return { key: key, value: values[key] };
                });
            };

            this.set = function(key, value) {
                if (!values[key]) {
                    keys.push(key);
                }
                values[key] = value;
                return this;
            };

            this.clearAll = function() {
                keys = [];
                values = {};
            }
        };

        var Relationship = function(start, end) {
            var label;
            var classes = [];

            this.class = function(classesString) {
                if (arguments.length == 1) {
                    classes = classesString.split(" ").filter(function(className) {
                        return className.length > 0 && className != "relationship";
                    });
                    return this;
                }
                return ["relationship"].concat(classes);
            };

            this.label = function(labelText) {
                if (arguments.length == 1) {
                    label = labelText;
                    return this;
                }
                return label;
            };

            this.start = start;
            this.end = end;
        };

        function generateNodeId() {
            while (nodes[highestId]) {
                highestId++;
            }
            return highestId;
        }

        model.createNode = function(optionalNodeId) {
            var nodeId = optionalNodeId || generateNodeId();
            var node = new Node();
            node.id = nodeId;
            nodes[nodeId] = node;
            return node;
        };

        model.deleteNode = function(node) {
            relationships = relationships.filter(function (relationship) {
                return !(relationship.start === node || relationship.end == node);
            });
            delete nodes[node.id];
        };

        model.createRelationship = function(start, end) {
            var relationship = new Relationship(start, end);
            relationships.push(relationship);
            return relationship;
        };

        model.nodeList = function() {
            var list = [];
            for (var nodeId in nodes) {
                if (nodes.hasOwnProperty(nodeId)) {
                    list.push(nodes[nodeId]);
                }
            }
            return list;
        };

        model.lookupNode = function(nodeId) {
            return nodes[nodeId];
        };

        model.relationshipList = function() {
            return relationships;
        };

        model.internalScale = function(newScale) {
            if (arguments.length == 1) {
                internalScale = parseFloat(newScale);
                return this;
            }
            return internalScale;
        };

        model.externalScale = function(newScale) {
            if (arguments.length == 1) {
                externalScale = parseFloat(newScale);
                return this;
            }
            return externalScale;
        };

        return model;
    };

    gd.scaling = function() {

        var scaling = {};

        scaling.nodeBox = function( node )
        {
            var margin = gd.parameters.radius + gd.parameters.nodeStrokeWidth / 2;
            return {
                x1: node.ex() - margin,
                y1: node.ey() - margin,
                x2: node.ex() + margin,
                y2: node.ey() + margin
            };
        };

        scaling.boxNormalise = function( box )
        {
            return {
                x1: box.width > 0 ? box.x : box.x + box.width,
                y1: box.height > 0 ? box.y : box.y +box. height,
                x2: box.width < 0 ? box.x : box.x + box.width,
                y2: box.height < 0 ? box.y : box.y + box.height
            };
        };

        scaling.boxUnion = function ( boxes )
        {
            if ( boxes.length < 1 )
            {
                return { x1:0, y1:0, x2:0, y2:0 };
            }
            return boxes.reduce( function ( previous, current )
            {
                return {
                    x1:Math.min( previous.x1, current.x1 ),
                    y1:Math.min( previous.y1, current.y1 ),
                    x2:Math.max( previous.x2, current.x2 ),
                    y2:Math.max( previous.y2, current.y2 )
                };
            } );
        };

        function smallestContainingBox(graph) {
            function boundingBox( speechBubble )
            {
                return speechBubble.boundingBox;
            }

            var bounds = scaling.boxUnion( graph.nodeList().map( scaling.nodeBox )
                .concat( graph.nodeList().filter(gd.hasProperties ).map( gd.speechBubble( graph ) ).map( boundingBox )
                .map( scaling.boxNormalise ) ) );

            return { x: bounds.x1, y: bounds.y1,
                width: (bounds.x2 - bounds.x1), height: (bounds.y2 - bounds.y1) }
        }

        scaling.centeredOrScaledViewBox = function(viewDimensions, diagramExtent) {
            var xScale = diagramExtent.width / viewDimensions.width;
            var yScale = diagramExtent.height / viewDimensions.height;
            var scaleFactor = xScale < 1 && yScale < 1 ? 1 : (xScale > yScale ? xScale : yScale);

            return {
                x: ((diagramExtent.width - viewDimensions.width * scaleFactor) / 2) + diagramExtent.x,
                y: ((diagramExtent.height - viewDimensions.height * scaleFactor) / 2) + diagramExtent.y,
                width: viewDimensions.width * scaleFactor,
                height: viewDimensions.height * scaleFactor
            };
        };

        scaling.centerOrScaleDiagramToFitSvg = function(graph, view) {
            var svgElement = view.node();
            var viewDimensions = {
                width: svgElement.clientWidth,
                height: svgElement.clientHeight
            };
            var diagramExtent = smallestContainingBox( graph );
            var box = scaling.centeredOrScaledViewBox( viewDimensions, diagramExtent );

            view
                .attr("viewBox", [box.x, box.y, box.width, box.height].join( " " ));
        };

        scaling.sizeSvgToFitDiagram = function(graph, view) {
            var box = smallestContainingBox( graph );

            view
                .attr("viewBox", [box.x, box.y, box.width, box.height].join( " " ))
                .attr("width", box.width * graph.externalScale())
                .attr("height", box.height * graph.externalScale());
        };

        return scaling;
    }();

    gd.markup = function() {

        var markup = {};

        markup.parseAll = function ( selection )
        {
            var models = [];
            selection.each( function ()
            {
                models.push( markup.parse( d3.select( this ) ) );
            } );
            return models;
        };

        markup.parse = function(selection) {
            var model = gd.model();

            if (selection.attr("data-internal-scale")) {
                model.internalScale(selection.attr("data-internal-scale"));
            }
            if (selection.attr("data-external-scale")) {
                model.externalScale(selection.attr("data-external-scale"));
            }

            selection.selectAll(".node").each(function () {
                var nodeMarkup = d3.select(this);
                var id = nodeMarkup.attr("data-node-id");
                var node = model.createNode(id);
                node.class(nodeMarkup.attr("class") || "");
                node.x(nodeMarkup.attr("data-x"));
                node.y(nodeMarkup.attr("data-y"));
                nodeMarkup.select("span.caption").each(function() {
                    node.label(d3.select(this).text());
                });
                nodeMarkup.select("dl.properties").each(function() {
                    var elements = d3.select(this).selectAll("dt, dd");
                    var currentKey;
                    elements.each(function() {
                        if (this.nodeName.toLowerCase() === "dt") {
                            currentKey = d3.select(this).text();
                        } else if (currentKey && this.nodeName.toLowerCase() === "dd") {
                            node.properties().set(currentKey, d3.select(this).text());
                        }
                    })
                })
            });

            selection.selectAll(".relationship").each(function () {
                var relationshipMarkup = d3.select(this);
                var fromId = relationshipMarkup.attr("data-from");
                var toId = relationshipMarkup.attr("data-to");
                var relationship = model.createRelationship(model.lookupNode(fromId), model.lookupNode(toId));
                relationship.class(relationshipMarkup.attr("class") || "");
                relationshipMarkup.select("span.type" ).each(function() {
                    relationship.label(d3.select(this).text());
                });
            });

            return model;
        };

        markup.format = function(model, container) {
            var ul = container.append("ul")
                .attr("class", "graph-diagram-markup")
                .attr("data-internal-scale", model.internalScale())
                .attr("data-external-scale", model.externalScale());

            model.nodeList().forEach(function(node) {
                var li = ul.append("li")
                    .attr("class", node.class().join(" "))
                    .attr("data-node-id", node.id)
                    .attr("data-x", node.x())
                    .attr("data-y", node.y());

                if (node.label()) {
                    li.append("span")
                        .attr("class", "caption")
                        .text(node.label());
                }

                if (node.properties().list().length > 0) {
                    var dl = li.append("dl")
                        .attr("class", "properties");

                    node.properties().list().forEach(function(property) {
                        dl.append("dt")
                            .text(property.key);
                        dl.append("dd")
                            .text(property.value);
                    });
                }
            });

            model.relationshipList().forEach(function(relationship) {
                var li = ul.append("li")
                    .attr("class", relationship.class().join(" "))
                    .attr("data-from", relationship.start.id)
                    .attr("data-to", relationship.end.id);

                if (relationship.label()) {
                    li.append("span")
                        .attr("class", "type")
                        .text(relationship.label());
                }
            });
        };

        return markup;
    }();

    gd.horizontalArrowOutline = function(start, end) {
        var shaftRadius = 4;
        var headRadius = 15;
        var headLength = 30;
        var shoulder = start < end ? end - headLength : end + headLength;
        return ["M", start, shaftRadius,
            "L", shoulder, shaftRadius,
            "L", shoulder, headRadius,
            "L", end, 0,
            "L", shoulder, -headRadius,
            "L", shoulder, -shaftRadius,
            "L", start, -shaftRadius,
            "Z"].join(" ");
    };

    gd.chooseSpeechBubbleOrientation = function(focusNode, relatedNodes) {
        var orientations = [
            { key: "WEST"       , style: "horizontal", mirrorX: -1, mirrorY:  1, angle:  180 },
            { key: "NORTH-WEST" , style: "diagonal",   mirrorX: -1, mirrorY: -1, angle: -135 },
            { key: "NORTH"      , style: "vertical",   mirrorX:  1, mirrorY: -1, angle:  -90 },
            { key: "NORTH-EAST" , style: "diagonal",   mirrorX:  1, mirrorY: -1, angle:  -45 },
            { key: "EAST"       , style: "horizontal", mirrorX:  1, mirrorY:  1, angle:    0 },
            { key: "SOUTH-EAST" , style: "diagonal",   mirrorX:  1, mirrorY:  1, angle:   45 },
            { key: "SOUTH"      , style: "vertical",   mirrorX:  1, mirrorY:  1, angle:   90 },
            { key: "SOUTH-WEST" , style: "diagonal",   mirrorX: -1, mirrorY:  1, angle:  135 }
        ];

        orientations.forEach(function(orientation) {
            orientation.closest = 180;
        });

        relatedNodes.forEach(function(relatedNode) {
            orientations.forEach(function(orientation) {
                var angle = Math.abs(focusNode.angleTo( relatedNode ) - orientation.angle);
                if (angle > 180) angle = 360 - angle;
                if (angle < orientation.closest) {
                    orientation.closest = angle;
                }
            });
        });

        var maxAngle = 0;
        var bestOrientation = orientations[0];
        orientations.forEach(function(orientation) {
            if (orientation.closest > maxAngle) {
                maxAngle = orientation.closest;
                bestOrientation = orientation;
            }
        });

        return bestOrientation;
    };

    gd.speechBubblePath = function(textSize, style, margin, padding) {
        var width = textSize.width, height = textSize.height;
        var styles = {
            diagonal: [
                "M", 0, 0,
                "L", margin + padding, margin,
                "L", margin + width + padding, margin,
                "A", padding, padding, 0, 0, 1, margin + width + padding * 2, margin + padding,
                "L", margin + width + padding * 2, margin + height + padding,
                "A", padding, padding, 0, 0, 1, margin + width + padding, margin + height + padding * 2,
                "L", margin + padding, margin + height + padding * 2,
                "A", padding, padding, 0, 0, 1, margin, margin + height + padding,
                "L", margin, margin + padding,
                "Z"
            ],
            horizontal: [
                "M", 0, 0,
                "L", margin, -padding,
                "L", margin, -height / 2,
                "A", padding, padding, 0, 0, 1, margin + padding, -height / 2 - padding,
                "L", margin + width + padding, -height / 2 - padding,
                "A", padding, padding, 0, 0, 1, margin + width + padding * 2, -height / 2,
                "L", margin + width + padding * 2, height / 2,
                "A", padding, padding, 0, 0, 1, margin + width + padding, height / 2 + padding,
                "L", margin + padding, height / 2 + padding,
                "A", padding, padding, 0, 0, 1, margin, height / 2,
                "L", margin, padding,
                "Z"
            ],
            vertical: [
                "M", 0, 0,
                "L", -padding, margin,
                "L", -width / 2, margin,
                "A", padding, padding, 0, 0, 0, -width / 2 - padding, margin + padding,
                "L", -width / 2 - padding, margin + height + padding,
                "A", padding, padding, 0, 0, 0, -width / 2, margin + height + padding * 2,
                "L", width / 2, margin + height + padding * 2,
                "A", padding, padding, 0, 0, 0, width / 2 + padding, margin + height + padding,
                "L", width / 2 + padding, margin + padding,
                "A", padding, padding, 0, 0, 0, width / 2, margin,
                "L", padding, margin,
                "Z"
            ]
        };
        return styles[style].join(" ");
    };

    gd.speechBubble = function ( model )
    {
        return function ( node )
        {
            var relatedNodes = [];
            model.relationshipList().forEach( function ( relationship )
            {
                if ( relationship.start === node )
                {
                    relatedNodes.push( relationship.end );
                }
                if ( relationship.end === node )
                {
                    relatedNodes.push( relationship.start );
                }
            } );
            var orientation = gd.chooseSpeechBubbleOrientation( node, relatedNodes );

            var propertyKeysWidth = d3.max( node.properties().list(), function ( property )
            {
                return gd.textDimensions.measure( property.key + ": " );
            } );
            var propertyValuesWidth = d3.max( node.properties().list(), function ( property )
            {
                return gd.textDimensions.measure( property.value );
            } );
            var textSize = {
                width:propertyKeysWidth + propertyValuesWidth,
                height:node.properties().list().length * 50
            };

            var mirror = "scale(" + orientation.mirrorX + "," + orientation.mirrorY + ") ";

            var diagonalRadius = gd.parameters.radius * Math.sqrt( 2 ) / 2;
            var nodeOffsetOptions = {
                diagonal:{ attach:{ x:diagonalRadius, y:diagonalRadius },
                    textCorner:{
                        x:gd.parameters.speechBubbleMargin + gd.parameters.speechBubblePadding,
                        y:gd.parameters.speechBubbleMargin + gd.parameters.speechBubblePadding
                    } },
                horizontal:{ attach:{ x:gd.parameters.radius, y:0 },
                    textCorner:{
                        x:gd.parameters.speechBubbleMargin + gd.parameters.speechBubblePadding,
                        y:-textSize.height / 2
                    } },
                vertical:{ attach:{ x:0, y:gd.parameters.radius },
                    textCorner:{
                        x:-textSize.width / 2,
                        y:gd.parameters.speechBubbleMargin + gd.parameters.speechBubblePadding
                    } }
            };
            var nodeCenterOffset = nodeOffsetOptions[orientation.style].attach;
            var textCorner = nodeOffsetOptions[orientation.style].textCorner;

            var translate = "translate(" + (node.ex() + nodeCenterOffset.x * orientation.mirrorX) + ","
                + (node.ey() + nodeCenterOffset.y * orientation.mirrorY) + ") ";

            var textOrigin = {
                x:propertyKeysWidth + orientation.mirrorX * (textCorner.x)
                    - (orientation.mirrorX == -1 ? textSize.width : 0),
                y:orientation.mirrorY * (textCorner.y)
                    - (orientation.mirrorY == -1 ? textSize.height : 0)
            };

            var boundingPadding = gd.parameters.speechBubblePadding + gd.parameters.speechBubbleStrokeWidth / 2;

            var boundingBox = {
                x:node.ex() + (nodeCenterOffset.x + textCorner.x - boundingPadding) * orientation.mirrorX,
                y:node.ey() + (nodeCenterOffset.y + textCorner.y - boundingPadding) * orientation.mirrorY,
                width:orientation.mirrorX * (textSize.width + (boundingPadding * 2)),
                height:orientation.mirrorY * (textSize.height + (boundingPadding * 2))
            };

            return {
                properties:node.properties().list().map( function ( property )
                {
                    return {
                        keyText:property.key + ": ",
                        valueText:property.value,
                        textOrigin:textOrigin
                    }
                } ),
                groupTransform:translate,
                outlineTransform:mirror,
                outlinePath:gd.speechBubblePath( textSize, orientation.style,
                    gd.parameters.speechBubbleMargin, gd.parameters.speechBubblePadding ),
                boundingBox:boundingBox
            };
        }
    };

    gd.textDimensions = function() {
        var textDimensions = {};

        textDimensions.measure = function(text) {
            var canvasSelection = d3.select("#textMeasuringCanvas").data([this]);
            canvasSelection.enter().append("canvas")
                .attr("id", "textMeasuringCanvas");

            var canvas = canvasSelection.node();
            var context = canvas.getContext("2d");
            context.font = "normal normal normal 50px/normal Gill Sans";
            return context.measureText(text).width;
        };

        return textDimensions;
    }();

    gd.hasProperties = function ( node )
    {
        return node.properties().list().length > 0;
    };

    gd.diagram = function()
    {
        var nodeBehaviour = function() {};
        var relationshipBehaviour = function() {};
        var scaling = gd.scaling.sizeSvgToFitDiagram;

        var diagram = function ( selection )
        {
            selection.each( function ( model )
            {
                var view = d3.select( this );

                function cx(d) {
                    return d.ex();
                }
                function cy(d) {
                    return d.ey();
                }

                function label(d) {
                    return d.label();
                }

                function nodeClasses(d) {
                    return d.class().join(" ") + " " + "node-id-" + d.id;
                }

                var nodes = view.selectAll("circle.node")
                    .data(d3.values(model.nodeList()));

                nodes.exit().remove();

                nodes.enter().append("svg:circle")
                    .attr("class", nodeClasses)
                    .attr("r", gd.parameters.radius)
                    .call(nodeBehaviour);

                nodes
                    .attr("cx", cx)
                    .attr("cy", cy);

                function horizontalArrow(d) {
                    var length = d.start.distanceTo(d.end);
                    var side = d.end.isLeftOf(d.start) ? -1 : 1;
                    return gd.horizontalArrowOutline(
                        side * (gd.parameters.radius + gd.parameters.nodeStartMargin),
                        side * (length - (gd.parameters.radius + gd.parameters.nodeEndMargin)));
                }

                function midwayBetweenStartAndEnd(d) {
                    var length = d.start.distanceTo(d.end);
                    var side = d.end.isLeftOf(d.start) ? -1 : 1;
                    return side * length / 2;
                }

                function translateToStartNodeCenterAndRotateToRelationshipAngle(d) {
                    var angle = d.start.angleTo(d.end);
                    if (d.end.isLeftOf(d.start)) {
                        angle += 180;
                    }
                    return "translate(" + d.start.ex() + "," + d.start.ey() + ") rotate(" + angle + ")";
                }

                function relationshipClasses(d) {
                    return d.class().join(" ");
                }

                var relationshipGroup = view.selectAll("g.relationship")
                    .data(model.relationshipList());

                relationshipGroup.exit().remove();

                relationshipGroup.enter().append("svg:g")
                    .attr("class", relationshipClasses);

                relationshipGroup
                    .attr("transform", translateToStartNodeCenterAndRotateToRelationshipAngle);

                function singleton(d) {
                    return [d];
                }

                var relationshipPath = relationshipGroup.selectAll("path.relationship")
                    .data(singleton);

                relationshipPath.enter().append("svg:path")
                    .attr("class", relationshipClasses)
                    .call(relationshipBehaviour);

                relationshipPath
                    .attr("d", horizontalArrow);

                function relationshipWithLabel(d) {
                    return [d].filter(label);
                }

                var relationshipLabel = relationshipGroup.selectAll("text.type")
                    .data(relationshipWithLabel);

                relationshipLabel.exit().remove();

                relationshipLabel.enter().append("svg:text")
                    .attr("class", "type")
                    .call(relationshipBehaviour);

                relationshipLabel
                    .attr("x", midwayBetweenStartAndEnd)
                    .attr("y", 0 )
                    .text(label);

                function renderBoundVariables(className) {
                    function boundVariableClasses(d) {
                        return className + " " + d.class();
                    }

                    var boundVariables = view.selectAll("text." + className)
                        .data(d3.values(model.nodeList()).filter(label));

                    boundVariables.exit().remove();

                    boundVariables.enter().append("svg:text")
                        .attr("class", boundVariableClasses)
                        .call(nodeBehaviour);

                    boundVariables
                        .attr("x", cx)
                        .attr("y", cy)
                        .text(label);
                }

                renderBoundVariables("caption-shadow");
                renderBoundVariables("caption");


                var speechBubbleGroup = view.selectAll("g.speech-bubble")
                    .data(d3.values(model.nodeList()).filter(gd.hasProperties ).map(gd.speechBubble(model)));

                speechBubbleGroup.exit().remove();

                speechBubbleGroup.enter().append("svg:g")
                    .attr("class", "speech-bubble");

                speechBubbleGroup
                    .attr("transform", function(speechBubble) { return speechBubble.groupTransform; } );

                var speechBubbleOutline = speechBubbleGroup.selectAll("path.speech-bubble-outline")
                    .data(singleton);

                speechBubbleOutline.exit().remove();

                speechBubbleOutline.enter().append("svg:path")
                    .attr("class", "speech-bubble-outline");

                speechBubbleOutline
                    .attr("transform", function(speechBubble) { return speechBubble.outlineTransform; })
                    .attr("d", function(speechBubble) { return speechBubble.outlinePath; });

                var propertyKeys = speechBubbleGroup.selectAll("text.speech-bubble-content.property-key")
                    .data(function(speechBubble) { return speechBubble.properties; });

                propertyKeys.exit().remove();

                propertyKeys.enter().append("svg:text")
                    .attr("class", "speech-bubble-content property-key");

                propertyKeys
                    .attr("x", function(property) { return property.textOrigin.x - 10; })
                    // -10 because trailing space gets trimmed
                    .attr("y", function(property, i) {
                        return i * 50 + property.textOrigin.y + 25
                    })
                    .text(function(property) { return property.keyText; });

                var propertyValues = speechBubbleGroup.selectAll("text.speech-bubble-content.property-value")
                    .data(function(speechBubble) { return speechBubble.properties; });

                propertyValues.exit().remove();

                propertyValues.enter().append("svg:text")
                    .attr("class", "speech-bubble-content property-value");

                propertyValues
                    .attr("x", function(property) { return property.textOrigin.x; })
                    .attr("y", function(property, i) {
                        return i * 50 + property.textOrigin.y + 25
                    })
                    .text(function(property) { return property.valueText; });

                scaling( model, view );
            } );
        };

        diagram.nodeBehaviour = function(behaviour) {
            nodeBehaviour = behaviour;
            return diagram;
        };

        diagram.relationshipBehaviour = function(behaviour) {
            relationshipBehaviour = behaviour;
            return diagram;
        };

        diagram.scaling = function(scalingFunction) {
            scaling = scalingFunction;
            return this;
        };

        return diagram;
    };
})();
