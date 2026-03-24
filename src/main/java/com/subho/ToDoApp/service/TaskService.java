package com.subho.ToDoApp.service;

import com.subho.ToDoApp.entity.Task;
import com.subho.ToDoApp.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    // Constructor Injection
    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    // CREATE
    public Task createTask(Task task) {
        return taskRepository.save(task);
    }

    // READ ALL
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    // READ BY ID
    public Task getTaskById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found with id: " + id));
    }

    // UPDATE
    public Task updateTask(Long id, Task updatedTask) {
        Task existingTask = getTaskById(id);

        existingTask.setTaskName(updatedTask.getTaskName());
        existingTask.setCompleted(updatedTask.isCompleted());

        return taskRepository.save(existingTask);
    }

    // DELETE
    public void deleteTask(Long id) {
        Task existingTask = getTaskById(id);
        taskRepository.delete(existingTask);
    }
}