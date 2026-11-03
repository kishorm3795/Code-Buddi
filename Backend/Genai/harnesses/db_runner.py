"""
Database execution harnesses for SQL (SQLite) and MongoDB scripts.
"""

def prepare_sql_payload(code: str) -> str:
    """
    Format standard ANSI SQL queries for SQLite3 CLI runner.
    Enables table column headers and clean tabular display.
    """
    directives = [
        ".headers on",
        ".mode box",
        ".nullvalue NULL",
    ]
    header = "\n".join(directives) + "\n\n"
    return header + code.strip() + "\n"


def prepare_mongodb_payload(code: str) -> str:
    """
    Format MongoDB JavaScript query/script for Node.js execution with in-memory collection emulation.
    Allows running standard mongosh syntax like db.collection.insertOne(...) and db.collection.find().
    """
    harness = """// Code-Buddi In-Memory MongoDB Query Harness
class MockCollection {
    constructor(name) {
        this.name = name;
        this.documents = [];
    }

    insertOne(doc) {
        const _id = "id_" + Math.random().toString(36).substr(2, 9);
        const record = { _id, ...doc };
        this.documents.push(record);
        console.log(`{ acknowledged: true, insertedId: '${_id}' }`);
        return record;
    }

    insertMany(docs) {
        const ids = [];
        docs.forEach(doc => {
            const _id = "id_" + Math.random().toString(36).substr(2, 9);
            this.documents.push({ _id, ...doc });
            ids.push(_id);
        });
        console.log(`{ acknowledged: true, insertedCount: ${docs.length} }`);
    }

    find(query = {}) {
        const results = this.documents.filter(doc => {
            return Object.keys(query).every(key => doc[key] === query[key]);
        });
        return {
            toArray: () => results,
            forEach: (cb) => results.forEach(cb),
            pretty: () => console.log(JSON.stringify(results, null, 2)),
            [Symbol.iterator]: function* () {
                for (const item of results) yield item;
            }
        };
    }

    findOne(query = {}) {
        const res = this.documents.find(doc => {
            return Object.keys(query).every(key => doc[key] === query[key]);
        });
        console.log(JSON.stringify(res || null, null, 2));
        return res;
    }

    countDocuments() {
        console.log(this.documents.length);
        return this.documents.length;
    }
}

const db = new Proxy({}, {
    get: (target, prop) => {
        if (!target[prop]) target[prop] = new MockCollection(prop);
        return target[prop];
    }
});

// --- User Script Begin ---
"""
    footer = """
// --- User Script End ---
"""
    return harness + code.strip() + footer
