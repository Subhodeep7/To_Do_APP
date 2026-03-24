package com.subho.ToDoApp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.subho.ToDoApp.entity.Task;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

}
