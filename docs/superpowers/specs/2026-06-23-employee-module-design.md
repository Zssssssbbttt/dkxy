# 员工管理模块 设计文档

> 2026-06-23

## 1. 概述

员工管理模块是 ERP 系统的第一个业务模块，位于"办公中心 > 员工管理"下。包含员工注册和员工列表两个子页面。

**核心原则：** 模块独立。有自己的表、API、页面，通过 `user_id` 与登录系统关联，但不耦合。

## 2. 数据模型

### 2.1 新建表：employee_profiles

> 文件：`src/db/schema/employee-profiles.ts`

| 分组 | 字段 | 数据库列 | 类型 | 必填 |
|------|------|----------|------|------|
| — | id | id | uuid PK | — |
| — | user_id | user_id | uuid FK → users.id, UNIQUE | ✅ |
| 基本信息 | 工号 | employee_id | varchar(50) UNIQUE | ✅ |
| | 姓名 | name | varchar(50) | ✅ |
| | 名字拼音 | name_pinyin | varchar(100) | ✅ |
| | 英文名 | name_en | varchar(50) | ✅ |
| | 性别 | gender | varchar(10) | ✅ |
| | 出生日期 | birth_date | date | ✅ |
| | 民族 | ethnicity | varchar(20) | ✅ |
| | 联系方式 | phone | varchar(20) | ✅ |
| | 籍贯 | native_place | varchar(100) | ✅ |
| | 政治面貌 | political_status | varchar(20) | ✅ |
| 任职信息 | 所属部门 | department_id | uuid FK → departments.id | ✅ |
| | 岗位 | position | varchar(50) | ✅ |
| | 职级 | job_level | varchar(20) | ✅ |
| | 直接上级 | supervisor_id | uuid FK → employee_profiles.id | ✅ |
| | 工作地点 | work_location | varchar(100) | ✅ |
| | 成本中心 | cost_center | varchar(50) | ✅ |
| | 入职日期 | entry_date | date | ✅ |
| | 转正日期 | regular_date | date | ✅ |
| | 合同期限 | contract_term | varchar(30) | ✅ |
| 合同管理 | 合同类型 | contract_type | varchar(20) | ✅ |
| | 签订日期 | sign_date | date | ✅ |
| | 合同期限 | contract_period | varchar(30) | ✅ |
| | 续签提醒 | renewal_remind | boolean | ✅ |
| | 电子合同附件 | contract_file | varchar(500) | ✅ |
| 详细档案 | 教育经历 | education | jsonb | ❌ |
| | 工作履历 | work_history | jsonb | ❌ |
| | 项目经验 | project_exp | jsonb | ❌ |
| | 语言能力 | languages | jsonb | ❌ |
| | 职称证书 | certificates | jsonb | ❌ |
| | 技能标签 | skills | jsonb | ❌ |
| 家庭关系 | 父母姓名 | parent_names | varchar(100) | ❌ |
| | 父母电话 | parent_phones | varchar(50) | ❌ |
| — | — | created_at | timestamp | — |
| — | — | updated_at | timestamp | — |

**说明：**
- 详细档案和家庭关系用 JSON 存储（jsonb），不拆子表，灵活且查询方便
- `user_id` 一对一关联 users 表，一个用户只有一条档案
- `supervisor_id` 自关联，指向另一条 employee_profiles 记录

### 2.2 与 users 表的关系

```
users                          employee_profiles
┌────────────────────┐        ┌──────────────────────────┐
│ id (PK)            │◄──1:1──│ user_id (FK, UNIQUE)      │
│ employeeId (工号)   │        │ employee_id (基本信息工号)  │
│ phone (登录手机号)   │        │ name, gender, ...         │
│ password           │        │ department_id (FK)        │
│ name               │        │ supervisor_id (FK, 自引用) │
│ role               │        │ ...                       │
│ departmentId       │        └──────────────────────────┘
│ status             │
└────────────────────┘
```

- users 表：登录认证、角色权限
- employee_profiles 表：员工档案
- 创建员工时：先创建 users 记录（如需要），再创建 profiles 记录
- 查询时：通过 `user_id` 关联

## 3. API 设计

### 3.1 接口列表

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/employee/profiles` | 员工列表（支持分页、搜索、部门筛选） | 登录用户 |
| GET | `/api/employee/profiles/[id]` | 员工详情 | 登录用户 |
| POST | `/api/employee/profiles` | 创建员工档案 | 超管/admin |
| PUT | `/api/employee/profiles/[id]` | 更新员工档案 | 超管/admin |
| GET | `/api/employee/profiles/supervisors` | 获取可选上级列表 | 登录用户 |

### 3.2 接口详情

**POST /api/employee/profiles — 创建员工**

```json
// 请求
{
  "userId": "uuid",           // 可选，已有 users 账号时传入
  "phone": "13900000001",     // 必填，用于创建/关联 users 账号
  "password": "123456",       // 必填，仅新建 users 时需要
  // 基本信息
  "employeeId": "EMP002",
  "name": "张三",
  "namePinyin": "zhangsan",
  "nameEn": "Jack",
  "gender": "男",
  "birthDate": "1990-01-01",
  "ethnicity": "汉族",
  "nativePlace": "北京",
  "politicalStatus": "群众",
  // 任职信息
  "departmentId": "uuid",
  "position": "前端工程师",
  "jobLevel": "P6",
  "supervisorId": "uuid",
  "workLocation": "北京",
  "costCenter": "CC001",
  "entryDate": "2024-01-01",
  "regularDate": "2024-04-01",
  // 合同管理
  "contractType": "固定期限",
  "signDate": "2024-01-01",
  "contractPeriod": "3年",
  "renewalRemind": true,
  "contractFile": "/uploads/contract.pdf",
  // 详细档案（可选）
  "education": [...],
  "workHistory": [...],
  // 家庭关系（可选）
  "parentNames": "张父,李母",
  "parentPhones": "138xxx,139xxx"
}

// 响应 201
{
  "id": "uuid",
  ...所有字段
}
```

**GET /api/employee/profiles — 员工列表**

```
GET /api/employee/profiles?departmentId=xxx&search=张三&page=1&pageSize=20
```

响应：
```json
{
  "list": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

## 4. 页面结构

### 4.1 路由

```
src/app/(main)/employee/
  register/page.tsx     # 员工注册（/employee/register）
  list/page.tsx         # 员工列表（/employee/list）
```

### 4.2 员工注册页

分 5 个区块，每个区块一个卡片：

```
┌──────────────────────────────────────────────┐
│  员工注册                                     │
├──────────────────────────────────────────────┤
│  ┌─ 基本信息 ──────────────────────────────┐  │
│  │ 工号 | 姓名 | 名字拼音 | 英文名          │  │
│  │ 性别 | 出生日期 | 民族 | 联系方式        │  │
│  │ 籍贯 | 政治面貌                         │  │
│  └────────────────────────────────────────┘  │
│  ┌─ 任职信息 ──────────────────────────────┐  │
│  │ 所属部门 | 岗位 | 职级 | 直接上级        │  │
│  │ 工作地点 | 成本中心 | 入职日期 | 转正日期 │  │
│  │ 合同期限                               │  │
│  └────────────────────────────────────────┘  │
│  ┌─ 合同管理 ──────────────────────────────┐  │
│  │ 合同类型 | 签订日期 | 合同期限 | 续签提醒 │  │
│  │ 电子合同附件                           │  │
│  └────────────────────────────────────────┘  │
│  ┌─ 详细档案（非必填）──────────────────────┐  │
│  │ ...                                    │  │
│  └────────────────────────────────────────┘  │
│  ┌─ 家庭关系（非必填）──────────────────────┐  │
│  │ 父母姓名 | 父母电话                     │  │
│  └────────────────────────────────────────┘  │
│  [提交] [取消]                               │
└──────────────────────────────────────────────┘
```

### 4.3 员工列表页

```
┌──────────────────────────────────────────────┐
│  员工列表                        [+ 添加员工] │
│  [搜索...] [部门筛选▼]                       │
├──────────────────────────────────────────────┤
│ 工号 | 姓名 | 部门 | 岗位 | 手机号 | 状态 | 操作│
│ ...                                         │
│ 分页                                        │
└──────────────────────────────────────────────┘
```

## 5. 公共组件

| 组件 | 文件 | 说明 |
|------|------|------|
| FormCard | `src/components/shared/FormCard.tsx` | 表单分组卡片，标题 + 内容区 |
| FormGrid | `src/components/shared/FormGrid.tsx` | 2 列网格布局 |
| SearchBar | `src/components/shared/SearchBar.tsx` | 搜索 + 筛选栏 |
| DataTable | `src/components/shared/DataTable.tsx` | 通用表格（分页、排序） |
| PageHeader | `src/components/shared/PageHeader.tsx` | 页面标题 + 操作按钮 |

## 6. 公共接口

| 工具 | 文件 | 说明 |
|------|------|------|
| apiClient | `src/lib/api-client.ts` | 封装 fetch，统一处理 CSRF、错误 |
| usePagination | `src/hooks/usePagination.ts` | 分页 hook |
| useDebounce | `src/hooks/useDebounce.ts` | 搜索防抖 hook |

## 7. 设计风格

采用**紧凑型企业后台风**，参考既有系统的设计规范。

### 7.1 色彩

| 用途 | 色值 | Tailwind 映射 | 说明 |
|------|------|--------------|------|
| 主题色/品牌蓝 | #2853e0 | 自定义 | 标题左侧竖条、按钮、强调 |
| 背景色 | #fdfdfd | 自定义 | 卡片/容器底色 |
| 主文字色 | #333 | gray-800 近似 | 标题、label |
| 次要文字 | #9ba6cc | 自定义 | 禁用态、提示文字 |
| 边框/分割线 | #d6e0ff | 自定义 | 卡片 header/footer |
| 一般分割线 | #ccc | gray-300 近似 | 常规分割 |
| 必填星号 | #f56c6c | red-400 近似 | 表单项必填标记 |
| 输入框聚焦 | #2853e0 | 自定义 | 聚焦边框色 |

### 7.2 字体

| 属性 | 值 | 说明 |
|------|-----|------|
| 基础字号 | 12px | 全局默认 |
| 标题字号 | 14px | 卡片标题 |
| 大标题字号 | 16px | 页面标题 |
| 标题字重 | 600 | 卡片标题 |
| label 字重 | 400 | 表单项标签 |

### 7.3 间距

以 4px 为基准单位：4、8、12、16。

| 场景 | 值 |
|------|-----|
| 容器水平内边距 | 16px |
| 卡片间距 | 4px |
| 表单项间距 | 14px（表单页）/ 6px（列表页） |
| 按钮间距 | 8px |
| 标题左侧装饰线 | 宽 3px，左 padding 11px |

### 7.4 组件尺寸

| 控件 | 高度 |
|------|------|
| 按钮 | 26px |
| 小按钮 | 24px |
| 输入框 | 26px |
| 导航栏 | 36px |

### 7.5 圆角

| 场景 | 值 |
|------|-----|
| 卡片容器 | 4px |
| 弹窗 | 12px |

### 7.6 布局

- label 固定宽度 150px + 右对齐
- 表单默认 2 列网格
- 卡片间 gap 4px，紧凑排列

## 8. 实现顺序

1. 建表 employee_profiles
2. 创建公共组件（FormCard, FormGrid, PageHeader）
3. 创建 API（/api/employee/profiles）
4. 创建员工注册页面
5. 创建员工列表页面
6. 菜单中添加入口（数据库 seed）
7. 构建验证