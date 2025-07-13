# api-demo

## 注意

我们在开发时使用`nodemon`而不是`node`来运行代码，[nodemon官网](https://nodemon.io/)

```
"scripts": {
    "build": "tsup --clean",

    "dev": "tsup --watch & nodemon",
 
    "start": "node dist/main"
  },
```
这么做的目的只有一个：加快开发时效率，因为`nodemon`会自动重新启动应用程序。

你可以在`package.json`配置更多的细节
```
"nodemonConfig": {
    "watch": [
      "dist"
    ],
    "ext": "js",
    "exec": "node dist/main.js"
  }
  ```
