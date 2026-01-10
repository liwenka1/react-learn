# React Learn Monorepo

一个用于 React 学习的 monorepo 项目。

## 项目结构

```
react-learn/
├── packages/          # 实验包
│   └── package/      # 主实验包
└── examples/         # Demo 示例
    └── example/      # 示例项目
```

## 安装依赖

```bash
pnpm install
```

## 开发

```bash
# 运行 example
pnpm dev

# 构建所有包
pnpm build
```

## 包说明

- **@react-learn/package**: 用于实验的主包
- **example**: 用于演示的 demo 项目
