module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript'
  ],
  plugins: [
    '@babel/plugin-syntax-import-meta',
    function ({ types: t }) {
      return {
        visitor: {
          MemberExpression(path) {
            const object = path.node.object;
            if (
              t.isMetaProperty(object) &&
              object.meta.name === 'import' &&
              object.property.name === 'meta' &&
              t.isIdentifier(path.node.property, { name: 'env' })
            ) {
              path.replaceWith(t.memberExpression(t.identifier('process'), t.identifier('env')));
            }
          },
          UnaryExpression(path) {
            if (path.node.operator !== 'typeof') return;
            const arg = path.node.argument;
            if (t.isMetaProperty(arg) && arg.meta.name === 'import' && arg.property.name === 'meta') {
              path.node.argument = t.identifier('process');
            }
            if (
              t.isMemberExpression(arg) &&
              t.isMetaProperty(arg.object) &&
              arg.object.meta.name === 'import' &&
              arg.object.property.name === 'meta' &&
              t.isIdentifier(arg.property, { name: 'env' })
            ) {
              path.node.argument = t.memberExpression(t.identifier('process'), t.identifier('env'));
            }
          }
        }
      };
    }
  ]
};
