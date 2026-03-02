package com.wedding.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String side;
    private Boolean attending;

    @Builder.Default
    private Integer count = 1;

    private Boolean meal;
    @Builder.Default
    private Integer mealCount = 0;
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id")
    @JsonIgnore
    private Invitation invitation;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
