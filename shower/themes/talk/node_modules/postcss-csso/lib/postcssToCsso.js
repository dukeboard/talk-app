var parse = require('csso').parse;

function isDecl(node) {
    return node.type === 'decl';
}

function appendNodes(cssoNode, listProperty, postcssNode) {
    var list = cssoNode[listProperty];

    postcssNode.nodes.forEach(function(node) {
        list.insert(list.createItem(postcssToCsso(node)));
    });

    return cssoNode;
}

function getInfo(node) {
    return {
        postcssNode: node
    };
}

function parseToCsso(str, context, node) {
    var cssoNode;

    try {
        cssoNode = parse(str, {
            context: context
        });
    } catch (e) {
        if (e.name === 'CssSyntaxError') {
            throw node.error(e.message, { index: e.parseError.offset });
        }

        throw e;
    }

    cssoNode.info = getInfo(node);

    return cssoNode;
}

function createCssoNode(type, property, node) {
    return appendNodes(parseToCsso('', type, node), property, node);
}

function postcssToCsso(node) {
    switch (node.type) {
        case 'root':
            return createCssoNode('stylesheet', 'rules', node);

        case 'rule':
            return {
                type: 'Ruleset',
                info: getInfo(node),
                selector: parseToCsso(node.selector || '', 'selector', node),
                block: createCssoNode('block', 'declarations', node)
            };

        case 'atrule':
            var cssoNode = {
                type: 'Atrule',
                info: getInfo(node),
                name: node.name,
                expression: parseToCsso(node.params || '', 'atruleExpression', node),
                block: null
            };

            if (node.nodes) {
                if (node.nodes.some(isDecl)) {
                    cssoNode.block = createCssoNode('block', 'declarations', node);
                } else {
                    cssoNode.block = createCssoNode('stylesheet', 'rules', node);
                }
            }

            return cssoNode;

        case 'decl':
            return parseToCsso(
                (node.raws.before || '').trimLeft() +
                node.toString(),
                'declaration',
                node
            );

        case 'comment':
            return {
                type: 'Comment',
                info: getInfo(node),
                value: node.raws.left + node.text + node.raws.right
            };
    }
}

module.exports = postcssToCsso;
