package com.kyntus.Workflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Hada howa l'URL fin l'Frontend ghadi ytconnecta: http://localhost:8080/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Autoriser Next.js
                .withSockJS(); // Fallback ila makanch WebSocket supporté
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Les messages li jayin mn serveur ghadi ykounou f /topic
        registry.enableSimpleBroker("/topic");
        // Les messages li jayin mn client ghadi ybda b /app
        registry.setApplicationDestinationPrefixes("/app");
    }
}