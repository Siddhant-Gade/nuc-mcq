function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
const mockAdmins = [
    { id: 'ADM001', name: 'System Admin', email: 'admin@mscit.edu', role: 'SUPER_ADMIN', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
];
export async function getAdmins() {
    await delay(300);
    return [...mockAdmins];
}
export async function createAdmin(data) {
    await delay(600);
    const admin = {
        id: 'ADM' + String(mockAdmins.length + 1).padStart(3, '0'),
        name: data.name,
        email: data.email,
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    mockAdmins.push(admin);
    return admin;
}
