# ejs-gen README

## Features

This extension generate text file powered by [ejs template engine](http://ejs.co).

## Usage

This extension generates when `*.ejsgen.yaml` or `*.ejsgen.yml` file is saved.
`*.ejsgen.yaml` file must have two documents. first document is input and second document is ejs template.

## Extension Settings

This extension contributes the following settings:

* `ejs-gen.enable`: enable this extension
* `ejs-gen.disable`: disable this extension


## examples

### example 1 - helloworld
`helloworld.txt.ejsgen.yaml`
```yaml
name: world         # <-- input yaml
--- |
hello <%- name %>   # <-- ejs template
```

`helloworld.txt`
```
hello world   # <-- ejs template
```

### example 2 - sharing template
input - `code.ts.ejsgen.yaml`
```yaml
colors:
- Red
- Blue
- Black
--- |
<%- include('./gen.ejs') %>
```
input - `gen.ejs`
```ejs
<% for (let color of colors) { -%>
function <%- color %>() {
<%- $.block(`${color}-implementation`, '  throw new Error(\'not implemented\');') -%>
}

<% } %>
```

output - `code.ts`
```typescript
function Red() {
// -->> Red-implementation
  throw new Error('not implemented');
// <<-- Red-implementation
}

function Blue() {
// -->> Blue-implementation
  throw new Error('not implemented');
// <<-- Blue-implementation
}

function Black() {
// -->> Black-implementation
  throw new Error('not implemented');
// <<-- Black-implementation
}

```

## Known Issues

Please do not trust others `.ejsgen.yaml` file.

## Release Notes

### 0.0.3

fix $.blockMarker bugs.

### 0.0.2

input file format has changed to multi-document yaml.

### 0.0.1

Initial release of ejs-gen.

### For more information

* [EJS -- Embedded JavaScript templates](http://ejs.co)

**Enjoy!**
