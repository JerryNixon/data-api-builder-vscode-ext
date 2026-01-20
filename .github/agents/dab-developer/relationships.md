# Relationship Configuration Reference

## Overview

Relationships in DAB enable navigation between related entities in GraphQL queries. They define how entities connect via foreign keys or linking tables.

## Relationship Types

| Type | Cardinality | Description |
|------|-------------|-------------|
| One-to-Many | `one` → `many` | Parent has many children |
| Many-to-One | `many` → `one` | Child belongs to parent |
| Many-to-Many | `many` ↔ `many` | Both sides have many, via linking table |
| Self-Referencing | varies | Entity relates to itself |

---

## One-to-Many Relationship

### Scenario
A **Category** has many **Products**. Each **Product** belongs to one **Category**.

### Database Schema
```sql
CREATE TABLE Categories (
    CategoryId INT PRIMARY KEY,
    Name NVARCHAR(100)
);

CREATE TABLE Products (
    ProductId INT PRIMARY KEY,
    Name NVARCHAR(100),
    Price DECIMAL(18,2),
    CategoryId INT FOREIGN KEY REFERENCES Categories(CategoryId)
);
```

### DAB Configuration

Add both entities:
```bash
dab add Category --source dbo.Categories --permissions "anonymous:read"
dab add Product --source dbo.Products --permissions "anonymous:read"
```

Add relationship from Category to Products (one-to-many):
```bash
dab update Category \
  --relationship "products" \
  --cardinality many \
  --target.entity Product \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"
```

Add inverse relationship from Product to Category (many-to-one):
```bash
dab update Product \
  --relationship "category" \
  --cardinality one \
  --target.entity Category \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"
```

### Resulting JSON

```json
{
  "entities": {
    "Category": {
      "source": { "type": "table", "object": "dbo.Categories" },
      "relationships": {
        "products": {
          "cardinality": "many",
          "target.entity": "Product",
          "source.fields": ["CategoryId"],
          "target.fields": ["CategoryId"]
        }
      }
    },
    "Product": {
      "source": { "type": "table", "object": "dbo.Products" },
      "relationships": {
        "category": {
          "cardinality": "one",
          "target.entity": "Category",
          "source.fields": ["CategoryId"],
          "target.fields": ["CategoryId"]
        }
      }
    }
  }
}
```

### GraphQL Usage

Query category with products:
```graphql
query {
  categories {
    items {
      categoryId
      name
      products {
        items {
          productId
          name
          price
        }
      }
    }
  }
}
```

Query product with category:
```graphql
query {
  products {
    items {
      productId
      name
      price
      category {
        categoryId
        name
      }
    }
  }
}
```

---

## Many-to-Many Relationship

### Scenario
**Students** enroll in many **Courses**. **Courses** have many **Students**. The relationship is through an **Enrollments** linking table.

### Database Schema
```sql
CREATE TABLE Students (
    StudentId INT PRIMARY KEY,
    Name NVARCHAR(100)
);

CREATE TABLE Courses (
    CourseId INT PRIMARY KEY,
    Title NVARCHAR(100)
);

CREATE TABLE Enrollments (
    EnrollmentId INT PRIMARY KEY,
    StudentId INT FOREIGN KEY REFERENCES Students(StudentId),
    CourseId INT FOREIGN KEY REFERENCES Courses(CourseId),
    EnrollmentDate DATE
);
```

### DAB Configuration

Add entities:
```bash
dab add Student --source dbo.Students --permissions "anonymous:read"
dab add Course --source dbo.Courses --permissions "anonymous:read"
```

Add many-to-many relationship from Student to Courses:
```bash
dab update Student \
  --relationship "courses" \
  --cardinality many \
  --target.entity Course \
  --linking.object "dbo.Enrollments" \
  --linking.source.fields "StudentId" \
  --linking.target.fields "CourseId"
```

Add inverse relationship from Course to Students:
```bash
dab update Course \
  --relationship "students" \
  --cardinality many \
  --target.entity Student \
  --linking.object "dbo.Enrollments" \
  --linking.source.fields "CourseId" \
  --linking.target.fields "StudentId"
```

### Resulting JSON

```json
{
  "entities": {
    "Student": {
      "source": { "type": "table", "object": "dbo.Students" },
      "relationships": {
        "courses": {
          "cardinality": "many",
          "target.entity": "Course",
          "linking.object": "dbo.Enrollments",
          "linking.source.fields": ["StudentId"],
          "linking.target.fields": ["CourseId"]
        }
      }
    },
    "Course": {
      "source": { "type": "table", "object": "dbo.Courses" },
      "relationships": {
        "students": {
          "cardinality": "many",
          "target.entity": "Student",
          "linking.object": "dbo.Enrollments",
          "linking.source.fields": ["CourseId"],
          "linking.target.fields": ["StudentId"]
        }
      }
    }
  }
}
```

### GraphQL Usage

Query student with enrolled courses:
```graphql
query {
  students {
    items {
      studentId
      name
      courses {
        items {
          courseId
          title
        }
      }
    }
  }
}
```

Query course with enrolled students:
```graphql
query {
  courses {
    items {
      courseId
      title
      students {
        items {
          studentId
          name
        }
      }
    }
  }
}
```

---

## Self-Referencing Relationship

### Scenario
An **Employee** has a **Manager** who is also an **Employee**. An **Employee** may have multiple **Direct Reports**.

### Database Schema
```sql
CREATE TABLE Employees (
    EmployeeId INT PRIMARY KEY,
    Name NVARCHAR(100),
    ManagerId INT FOREIGN KEY REFERENCES Employees(EmployeeId)
);
```

### DAB Configuration

Add entity:
```bash
dab add Employee --source dbo.Employees --permissions "anonymous:read"
```

Add manager relationship (many-to-one):
```bash
dab update Employee \
  --relationship "manager" \
  --cardinality one \
  --target.entity Employee \
  --source.fields "ManagerId" \
  --target.fields "EmployeeId"
```

Add direct reports relationship (one-to-many):
```bash
dab update Employee \
  --relationship "directReports" \
  --cardinality many \
  --target.entity Employee \
  --source.fields "EmployeeId" \
  --target.fields "ManagerId"
```

### Resulting JSON

```json
{
  "entities": {
    "Employee": {
      "source": { "type": "table", "object": "dbo.Employees" },
      "relationships": {
        "manager": {
          "cardinality": "one",
          "target.entity": "Employee",
          "source.fields": ["ManagerId"],
          "target.fields": ["EmployeeId"]
        },
        "directReports": {
          "cardinality": "many",
          "target.entity": "Employee",
          "source.fields": ["EmployeeId"],
          "target.fields": ["ManagerId"]
        }
      }
    }
  }
}
```

### GraphQL Usage

Query employee with manager and direct reports:
```graphql
query {
  employees {
    items {
      employeeId
      name
      manager {
        employeeId
        name
      }
      directReports {
        items {
          employeeId
          name
        }
      }
    }
  }
}
```

---

## Composite Key Relationships

### Scenario
**OrderDetails** links **Orders** and **Products** with a composite foreign key.

### Database Schema
```sql
CREATE TABLE Orders (
    OrderId INT PRIMARY KEY,
    OrderDate DATE
);

CREATE TABLE Products (
    ProductId INT PRIMARY KEY,
    Name NVARCHAR(100)
);

CREATE TABLE OrderDetails (
    OrderId INT,
    ProductId INT,
    Quantity INT,
    PRIMARY KEY (OrderId, ProductId),
    FOREIGN KEY (OrderId) REFERENCES Orders(OrderId),
    FOREIGN KEY (ProductId) REFERENCES Products(ProductId)
);
```

### DAB Configuration

Add entities:
```bash
dab add Order --source dbo.Orders --permissions "anonymous:read"
dab add Product --source dbo.Products --permissions "anonymous:read"
dab add OrderDetail --source dbo.OrderDetails --permissions "anonymous:read"
```

Add relationships:
```bash
# Order has many OrderDetails
dab update Order \
  --relationship "details" \
  --cardinality many \
  --target.entity OrderDetail \
  --source.fields "OrderId" \
  --target.fields "OrderId"

# OrderDetail belongs to Order
dab update OrderDetail \
  --relationship "order" \
  --cardinality one \
  --target.entity Order \
  --source.fields "OrderId" \
  --target.fields "OrderId"

# OrderDetail belongs to Product
dab update OrderDetail \
  --relationship "product" \
  --cardinality one \
  --target.entity Product \
  --source.fields "ProductId" \
  --target.fields "ProductId"
```

### GraphQL Usage

```graphql
query {
  orders {
    items {
      orderId
      orderDate
      details {
        items {
          quantity
          product {
            productId
            name
          }
        }
      }
    }
  }
}
```

---

## Relationship Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `cardinality` | string | Yes | `"one"` or `"many"` |
| `target.entity` | string | Yes | Target entity name |
| `source.fields` | array | Yes* | Source entity join field(s) |
| `target.fields` | array | Yes* | Target entity join field(s) |
| `linking.object` | string | No | Linking table for many-to-many |
| `linking.source.fields` | array | No** | Linking table source columns |
| `linking.target.fields` | array | No** | Linking table target columns |

\* Required for direct relationships (not using linking table)
\*\* Required when using `linking.object`

---

## Relationship Naming Best Practices

### Good Names

| Relationship | Name | Why |
|--------------|------|-----|
| Category → Products | `products` | Plural, describes what you get |
| Product → Category | `category` | Singular, describes the parent |
| Employee → Manager | `manager` | Singular, specific role |
| Employee → Direct Reports | `directReports` | Describes the relationship |
| Student → Courses | `courses` | Plural, what student enrolls in |
| Order → Details | `details` or `lineItems` | Domain-appropriate term |

### Avoid

| Name | Problem |
|------|---------|
| `fk_products` | Implementation detail |
| `product_list` | Redundant |
| `Products` | Use lowercase/camelCase |
| `rel1` | Not descriptive |

---

## REST API and Relationships

**Important:** Relationships only work in GraphQL, not REST.

REST provides separate endpoints:
```
GET /api/Category
GET /api/Product
```

To get products for a category in REST, use filtering:
```
GET /api/Product?$filter=CategoryId eq 5
```

For nested data in one request, use GraphQL.

---

## Common Mistakes

### 1. Wrong Field Direction

```bash
# WRONG: Source fields should be on the entity being updated
dab update Product \
  --relationship "category" \
  --source.fields "CategoryId" \       # This is correct (Product has CategoryId)
  --target.fields "CategoryId"          # Category's key field

# Not this:
dab update Product \
  --source.fields "CategoryId" \       # Product's FK
  --target.fields "ProductId"          # Wrong! Should be Category's PK
```

### 2. Missing Inverse Relationship

If you want bidirectional navigation, add relationships on both entities:
```bash
# Only adds Category → Products
dab update Category --relationship "products" ...

# Also add Product → Category for the inverse
dab update Product --relationship "category" ...
```

### 3. Many-to-Many Without Linking Table

```bash
# WRONG: Missing linking.object for many-to-many
dab update Student \
  --relationship "courses" \
  --cardinality many \
  --target.entity Course \
  --source.fields "StudentId" \
  --target.fields "CourseId"

# CORRECT: Include linking table
dab update Student \
  --relationship "courses" \
  --cardinality many \
  --target.entity Course \
  --linking.object "dbo.Enrollments" \
  --linking.source.fields "StudentId" \
  --linking.target.fields "CourseId"
```

### 4. Target Entity Doesn't Exist

```bash
# Error: Target entity 'Categories' not found
dab update Product --relationship "category" --target.entity Categories

# Correct: Use exact entity name (case-sensitive)
dab update Product --relationship "category" --target.entity Category
```

---

## Circular References

GraphQL allows circular queries, but be careful of performance:

```graphql
query {
  categories {
    items {
      products {
        items {
          category {        # Back to category
            products {      # And back to products again!
              items { ... }
            }
          }
        }
      }
    }
  }
}
```

Use `depth-limit` in runtime configuration to prevent abuse:
```bash
dab configure --runtime.graphql.depth-limit 5
```

---

## Next Steps

- See [entities.md](entities.md) for entity configuration
- See [dab-update.md](dab-update.md) for CLI commands
- See [sql-metadata.md](sql-metadata.md) for discovering foreign keys
