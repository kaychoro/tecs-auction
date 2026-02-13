import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tecs_auction/main.dart';

void main() {
  testWidgets('registration screen renders expected fields', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const AuctionApp());

    expect(find.text('Bidder Registration'), findsOneWidget);
    expect(find.byKey(const Key('registration_email')), findsOneWidget);
    expect(find.byKey(const Key('registration_phone')), findsOneWidget);
    expect(find.byKey(const Key('registration_display_name')), findsOneWidget);
  });

  testWidgets('registration validation errors are shown for invalid submit', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const AuctionApp());

    await tester.tap(find.byKey(const Key('registration_submit')));
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Phone is required'), findsOneWidget);
    expect(find.text('Display name is required'), findsOneWidget);
  });
}
