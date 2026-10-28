/// Verified identity as reported by `GET /api/v1/auth/me`.
class StudentIdentity {
  const StudentIdentity({
    required this.authUserId,
    required this.roles,
    this.email,
    this.name,
    this.studentId,
    this.batchId,
    this.batchName,
    this.accessStatus,
    this.supportEmail,
  });

  final String authUserId;
  final String? email;
  final String? name;
  final String? studentId;
  final String? batchId;
  final String? batchName;
  final String? accessStatus;
  final String? supportEmail;
  final List<String> roles;

  bool get isStudent => roles.contains('STUDENT');

  factory StudentIdentity.fromMap(Map<String, dynamic> map) {
    return StudentIdentity(
      authUserId: '${map['authUserId'] ?? ''}',
      email: map['email'] == null ? null : '${map['email']}',
      name: map['name'] == null ? null : '${map['name']}',
      studentId: map['studentId'] == null ? null : '${map['studentId']}',
      batchId: map['batchId'] == null ? null : '${map['batchId']}',
      batchName: map['batchName'] == null ? null : '${map['batchName']}',
      accessStatus: map['accessStatus'] == null ? null : '${map['accessStatus']}',
      supportEmail: map['supportEmail'] == null ? null : '${map['supportEmail']}',
      roles: (map['roles'] as List<dynamic>? ?? const <dynamic>[])
          .map((role) => '$role')
          .toList(growable: false),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'authUserId': authUserId,
      'email': email,
      'name': name,
      'studentId': studentId,
      'batchId': batchId,
      'batchName': batchName,
      'accessStatus': accessStatus,
      'supportEmail': supportEmail,
      'roles': roles,
    };
  }
}
