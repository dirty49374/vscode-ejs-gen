# ejs-gen README

EJS Code Generator

![screen shot](https://raw.githubusercontent.com/dirty49374/vscode-ejs-gen/master/docs/screenshot.png)

## Features

This extension generate text file powered by [ejs template engine](http://ejs.co).

## Usage

This extension generates text file by writing `.ejsyaml` files. `.ejsyaml` file is `.yaml` file that contains two documents.
The first document is `input data` to generate code and the second document is `EJS template`.

```yaml
# input data
name: world
--- |
# EJS template
hello <%- name %> 
```

Above `helloworld.txt.ejsyaml` file will generate following `helloworld.txt` file.
```yaml
# EJS template
hello world
```

That's it. All you have to do is that write input data and ejs template in single yaml file(`.ejsyaml`) and save it.
This extension will automatically catch when file is saved and generate code.

## Extension Settings

This extension contributes the following settings:

* `ejs-gen.enable`: enable this extension
* `ejs-gen.disable`: disable this extension


## Examples

please check out other examples in [github page](https://github.com/dirty49374/vscode-ejs-gen/tree/master/examples).

## Known Issues

Please do not trust others `.ejsgen.yaml` file.

## Release Notes

### 0.0.7

support automatic file generation on file creation.

### 0.0.6

add `!fetch`, `!fetchtext`, `!fetchjson`, `!fetchyaml` custom tag.
add `ejs-gen.generate` command.

### 0.0.5

remove console logs

### 0.0.4

refactoring.

### 0.0.3

fix $.blockMarker bugs.

### 0.0.2

input file format has changed to multi-document yaml.

### 0.0.1

Initial release of ejs-gen.

### For more information

* [EJS -- Embedded JavaScript templates](http://ejs.co)

**Enjoy!**
