import { Button, Card, Form, Input, Space, Table, App as AntdApp, Modal, Tabs } from 'antd';
import { useEffect, useState } from 'react';

import { createDictEntry, deleteDictEntry, listDictionary, updateDictEntry } from '../../lib/admin';

const CATEGORIES = [
  { value: 'port', label: '港口' },
  { value: 'hs_code', label: 'HS Code' },
  { value: 'country', label: '国家' },
  { value: 'currency', label: '币种' },
  { value: 'unit', label: '单位' },
];

export function AdminDictionaryPage() {
  const { message } = AntdApp.useApp();
  const [activeTab, setActiveTab] = useState('port');
  const [items, setItems] = useState<Array<{ id: string; category: string; code: string; nameZh: string; nameEn: string | null; enabled: boolean }>>([]);
  const [editing, setEditing] = useState<Partial<{ id: string; category: string; code: string; nameZh: string; nameEn: string | null; enabled: boolean }> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (cat: string) => {
    setLoading(true);
    try {
      const data = await listDictionary(cat);
      setItems(data);
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(activeTab); }, [activeTab]);

  const save = async () => {
    if (!editing) return;
    if (!editing.code || !editing.nameZh) { message.error('代码和中文名必填'); return; }
    try {
      if (editing.id) {
        await updateDictEntry(editing.id, { nameZh: editing.nameZh, nameEn: editing.nameEn ?? undefined });
        message.success('已更新');
      } else {
        await createDictEntry({ category: activeTab, code: editing.code, nameZh: editing.nameZh, nameEn: editing.nameEn ?? undefined });
        message.success('已创建');
      }
      setEditing(null);
      void load(activeTab);
    } catch (err) {
      message.error(`失败: ${(err as { message?: string }).message ?? '未知'}`);
    }
  };

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ justifyContent: 'space-between', display: 'flex' }}>
          <h2 style={{ margin: 0 }}>基础数据字典</h2>
          <Button type="primary" onClick={() => setEditing({ category: activeTab })}>+ 新建条目</Button>
        </Space>
      </Card>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={CATEGORIES.map((c) => ({ key: c.value, label: c.label }))}
        />
        <Table
          size="small"
          rowKey="id"
          dataSource={items}
          loading={loading}
          pagination={false}
          columns={[
            { title: '代码', dataIndex: 'code', width: 150 },
            { title: '中文名', dataIndex: 'nameZh' },
            { title: '英文名', dataIndex: 'nameEn', width: 200, render: (v: string | null) => v ?? '-' },
            {
              title: '操作', width: 150,
              render: (_, r) => (
                <Space>
                  <Button type="link" size="small" onClick={() => setEditing(r)}>编辑</Button>
                  <Button type="link" size="small" danger onClick={async () => { await deleteDictEntry(r.id); message.success('已删'); void load(activeTab); }}>删除</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={editing?.id ? '编辑字典条目' : '新建字典条目'}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={save}
      >
        {editing && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="分类">{CATEGORIES.find((c) => c.value === activeTab)?.label}</Form.Item>
            <Form.Item label="代码" required>
              <Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} disabled={!!editing.id} />
            </Form.Item>
            <Form.Item label="中文名" required>
              <Input value={editing.nameZh ?? ''} onChange={(e) => setEditing({ ...editing, nameZh: e.target.value })} />
            </Form.Item>
            <Form.Item label="英文名">
              <Input value={editing.nameEn ?? ''} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}