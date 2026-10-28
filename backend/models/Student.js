class Student{
 constructor(id, name, email, password, enrolledCourses) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.enrolledCourses = enrolledCourses || [];
 }

  getDetails() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      enrolledCourses: this.enrolledCourses
    };
  }
}